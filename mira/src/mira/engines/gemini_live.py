"""Gemini Live conversation engine.

Turn sequence (per Gemini Live docs):
  1. Mic audio streams continuously via send_realtime_input — VAD runs server-side.
  2. When VAD detects speech end, Gemini processes and starts generating a response.
  3. Server sends model_turn.parts events (audio chunks, and for 3.1 possibly
     transcription in the same event; for 2.5 they arrive as separate events).
  4. Server sends output_transcription.text tokens concurrently with audio.
  5. Server sends turn_complete=True when the full response is done.
  6. If user speaks while model is talking, server sends interrupted=True —
     generation is cancelled, pending audio must be discarded.

Audio architecture:
  _AudioPlayer uses a callback-based sd.OutputStream. The portaudio thread pulls
  from a thread-safe queue, so writing chunks never blocks the asyncio event loop.
  On interruption, the queue is drained immediately.

Command dispatch:
  Transcription tokens are buffered until turn_complete, then the full text is
  parsed once for || commands. This prevents per-word face changes.
"""

import asyncio
import queue as _thread_queue

import numpy as np
import sounddevice as sd
from google import genai
from google.genai import types

from mira.config import get_config
from mira.engines.base import ConversationEngine, EngineEvent, EventCallback
from mira.utils.logging import get_logger

log = get_logger(__name__)

RECONNECT_DELAYS = [1, 2, 4, 8, 30]
_OUT_RATE = 24000
_OUT_BLOCKSIZE = 480  # 20 ms at 24 kHz


class _AudioPlayer:
    """Non-blocking audio player backed by a portaudio callback thread.

    write() enqueues PCM bytes from the asyncio thread.
    The portaudio callback drains the queue in a real-time audio thread.
    clear() discards buffered audio immediately (used on interruption).
    """

    def __init__(self) -> None:
        self._q: _thread_queue.Queue[np.ndarray] = _thread_queue.Queue(maxsize=256)
        self._leftover = np.zeros(0, dtype=np.float32)
        self._stream = sd.OutputStream(
            samplerate=_OUT_RATE,
            channels=1,
            dtype="float32",
            blocksize=_OUT_BLOCKSIZE,
            callback=self._callback,
        )

    def _callback(self, outdata: np.ndarray, frames: int, time_info, status) -> None:
        buf = self._leftover
        while len(buf) < frames:
            try:
                buf = np.concatenate([buf, self._q.get_nowait()])
            except _thread_queue.Empty:
                break
        if len(buf) >= frames:
            outdata[:, 0] = buf[:frames]
            self._leftover = buf[frames:]
        else:
            outdata[: len(buf), 0] = buf
            outdata[len(buf) :, 0] = 0.0
            self._leftover = np.zeros(0, dtype=np.float32)

    def write(self, pcm_bytes: bytes) -> None:
        pcm = np.frombuffer(pcm_bytes, dtype=np.int16).astype(np.float32) / 32767
        try:
            self._q.put_nowait(pcm)
        except _thread_queue.Full:
            log.warning("audio_player.buffer_full_dropping_chunk")

    def clear(self) -> None:
        while not self._q.empty():
            try:
                self._q.get_nowait()
            except _thread_queue.Empty:
                break
        self._leftover = np.zeros(0, dtype=np.float32)

    def start(self) -> None:
        self._stream.start()

    def stop(self) -> None:
        self._stream.stop()
        self._stream.close()


class GeminiLiveEngine(ConversationEngine):
    """Conversation engine backed by the Gemini Live bidirectional audio API."""

    def __init__(self, on_event: EventCallback, system_prompt: str) -> None:
        super().__init__(on_event)
        self._system_prompt = system_prompt
        cfg = get_config()
        self._client = genai.Client(api_key=cfg.gemini_api_key)
        self._model = cfg.gemini_model
        self._voice = cfg.gemini_voice
        self._temperature = cfg.gemini_temperature
        self._in_rate = cfg.audio_sample_rate
        self._frame_size = int(cfg.audio_sample_rate * cfg.audio_frame_ms / 1000)

        self._session = None
        self._session_ctx = None
        self._running = False
        self._player: _AudioPlayer | None = None
        self._mic_task: asyncio.Task | None = None
        self._recv_task: asyncio.Task | None = None

    # ── public interface ──────────────────────────────────────────────────────

    async def start(self) -> None:
        self._running = True
        self._player = _AudioPlayer()
        self._player.start()
        await self._connect()

    async def stop(self) -> None:
        self._running = False
        self._cancel_tasks()
        if self._player:
            self._player.stop()
            self._player = None
        await self._close_session()
        log.info("gemini_live.stopped")

    async def send_contextual_update(self, text: str) -> None:
        if not self._session:
            return
        try:
            await self._session.send(input=text, end_of_turn=False)
            log.debug("gemini_live.context_injected", text=text[:80])
        except Exception as e:
            log.warning("gemini_live.context_inject_failed", error=str(e))

    async def interrupt(self) -> None:
        pass  # Gemini Live handles interruptions natively via VAD

    async def inject_user_message(self, text: str) -> None:
        if not self._session:
            raise RuntimeError("Session not started")
        await self._session.send(input=text, end_of_turn=True)

    def is_running(self) -> bool:
        return self._running

    # ── internal helpers ──────────────────────────────────────────────────────

    def _cancel_tasks(self) -> None:
        for task in (self._mic_task, self._recv_task):
            if task and not task.done():
                task.cancel()
        self._mic_task = None
        self._recv_task = None

    async def _close_session(self) -> None:
        if self._session_ctx:
            try:
                await self._session_ctx.__aexit__(None, None, None)
            except Exception:
                pass
            self._session_ctx = None
            self._session = None

    async def _connect(self) -> None:
        config = types.LiveConnectConfig(
            response_modalities=["AUDIO"],
            output_audio_transcription=types.AudioTranscriptionConfig(),
            input_audio_transcription=types.AudioTranscriptionConfig(),
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=self._voice)
                )
            ),
            system_instruction=self._system_prompt,
            temperature=self._temperature,
        )

        for attempt, delay in enumerate(RECONNECT_DELAYS + [None]):
            try:
                self._session_ctx = self._client.aio.live.connect(
                    model=self._model, config=config
                )
                self._session = await self._session_ctx.__aenter__()
                log.info("gemini_live.connected", attempt=attempt)
                self._mic_task = asyncio.create_task(self._mic_loop())
                self._recv_task = asyncio.create_task(self._recv_loop())
                return
            except Exception as e:
                log.warning("gemini_live.connect_failed", error=str(e), attempt=attempt)
                await self._on_event(EngineEvent(kind="error", error=e))
                if delay is None:
                    log.error("gemini_live.giving_up")
                    self._running = False
                    return
                await asyncio.sleep(delay)

    # ── mic loop ──────────────────────────────────────────────────────────────

    async def _mic_loop(self) -> None:
        loop = asyncio.get_event_loop()
        q: asyncio.Queue[bytes] = asyncio.Queue()

        def _callback(indata, frames, time_info, status):
            pcm = (indata * 32767).astype(np.int16).tobytes()
            loop.call_soon_threadsafe(q.put_nowait, pcm)

        with sd.InputStream(
            samplerate=self._in_rate,
            channels=1,
            dtype="float32",
            blocksize=self._frame_size,
            callback=_callback,
        ):
            while self._running:
                chunk = await q.get()
                if not self._session:
                    continue
                try:
                    await self._session.send_realtime_input(
                        audio=types.Blob(data=chunk, mime_type=f"audio/pcm;rate={self._in_rate}")
                    )
                except Exception as e:
                    log.warning("gemini_live.mic_send_failed", error=str(e))
                    return

    # ── receive loop ──────────────────────────────────────────────────────────

    async def _recv_loop(self) -> None:
        speaking = False
        transcript_buf: list[str] = []

        try:
            async for response in self._session.receive():
                sc = response.server_content
                if not sc:
                    continue

                # ── interruption: user spoke while model was talking ───────
                if getattr(sc, "interrupted", False):
                    if self._player:
                        self._player.clear()
                    transcript_buf.clear()
                    if speaking:
                        speaking = False
                        await self._on_event(EngineEvent(kind="assistant_audio_ended"))
                    log.debug("gemini_live.interrupted")
                    continue

                # ── audio chunks → enqueue to player (non-blocking) ───────
                if sc.model_turn:
                    for part in sc.model_turn.parts:
                        if part.inline_data and self._player:
                            if not speaking:
                                speaking = True
                                await self._on_event(EngineEvent(kind="assistant_audio_started"))
                            self._player.write(part.inline_data.data)

                # ── transcription tokens → buffer until turn is done ──────
                if sc.output_transcription and sc.output_transcription.text:
                    transcript_buf.append(sc.output_transcription.text)

                # ── user speech transcript ─────────────────────────────────
                if sc.input_transcription and sc.input_transcription.text:
                    await self._on_event(
                        EngineEvent(kind="user_transcript", text=sc.input_transcription.text)
                    )

                # ── turn complete: emit full transcript once for command ───
                if sc.turn_complete:
                    if speaking:
                        speaking = False
                        await self._on_event(EngineEvent(kind="assistant_audio_ended"))
                    if transcript_buf:
                        full_text = "".join(transcript_buf)
                        transcript_buf.clear()
                        await self._on_event(EngineEvent(kind="assistant_text", text=full_text))
                    log.debug("gemini_live.turn_complete")

        except asyncio.CancelledError:
            pass
        except Exception as e:
            if not self._running:
                return
            log.warning("gemini_live.recv_error", error=str(e))
            await self._on_event(EngineEvent(kind="error", error=e))
            # Tear down the broken session and reconnect cleanly
            self._cancel_tasks()
            await self._close_session()
            await asyncio.sleep(1)
            await self._connect()
