"""Mira — dementia companion robot orchestrator."""

import asyncio
import signal
from datetime import datetime, timezone

from mira.arduino.mock import MockArduino
from mira.arduino.serial_bridge import SerialBridge
from mira.behavior.presence import PresenceManager, PresenceState
from mira.behavior.router import BehaviorRouter
from mira.config import get_config
from mira.engines.base import EngineEvent
from mira.engines.gemini_live import GeminiLiveEngine
from mira.memory.profile import DEFAULT_PROFILE, load_profile
from mira.memory.store import MemoryStore
from mira.prompts.system import build_system_prompt
from mira.utils.logging import get_logger
from pathlib import Path

log = get_logger(__name__)


class MiraOrchestrator:
    def __init__(self) -> None:
        self._cfg = get_config()

        # Hardware bridge
        if self._cfg.mock_arduino:
            self._bridge = MockArduino()
        else:
            self._bridge = SerialBridge(self._cfg.serial_port)

        # Memory
        self._memory = MemoryStore(Path(self._cfg.memory_path))

        # Profile
        profile_path = Path(self._cfg.person_profile)
        self._profile = load_profile(profile_path) if profile_path.exists() else DEFAULT_PROFILE

        # Subsystems
        self._presence = PresenceManager()
        self._router   = BehaviorRouter(self._bridge)
        self._engine: GeminiLiveEngine | None = None

        self._running = False
        self._session_id: str | None = None

    async def run(self) -> None:
        self._running = True
        log.info("mira.starting", profile=self._profile.name, mock=self._cfg.mock_arduino)

        await self._bridge.connect()
        self._session_id = await self._memory.start_session()

        loop = asyncio.get_running_loop()
        for sig in (signal.SIGINT, signal.SIGTERM):
            loop.add_signal_handler(sig, lambda: asyncio.create_task(self.shutdown()))

        try:
            await self._main_loop()
        finally:
            await self.shutdown()

    async def shutdown(self) -> None:
        if not self._running:
            return
        self._running = False
        log.info("mira.shutting_down")

        if self._engine:
            await self._engine.stop()

        if self._session_id:
            await self._memory.end_session("Session ended normally.")

        await self._bridge.disconnect()
        log.info("mira.stopped")

    # ── main loop ─────────────────────────────────────────────────────────────

    async def _main_loop(self) -> None:
        prev_pir = False
        prev_presence = self._presence.state

        while self._running:
            reading = self._bridge.latest

            # Drive presence state machine on PIR changes
            if reading and reading.pir != prev_pir:
                prev_pir = reading.pir
                self._presence.on_pir_change(reading.pir)

            # React to any presence state change (including timer-driven transitions)
            current = self._presence.state
            if current != prev_presence:
                prev_presence = current
                await self._handle_presence_transition(current)

            await asyncio.sleep(0.1)

    async def _handle_presence_transition(self, state: PresenceState) -> None:
        if state == PresenceState.AWAKE and (self._engine is None or not self._engine.is_running()):
            await self._wake()
        elif state == PresenceState.ASLEEP and self._engine and self._engine.is_running():
            await self._sleep()

    # ── lifecycle ─────────────────────────────────────────────────────────────

    async def _wake(self) -> None:
        log.info("mira.waking")

        now = datetime.now(timezone.utc)
        memory_context = self._memory.build_context_note()
        system_prompt  = build_system_prompt(self._profile, memory_context, now)

        self._engine = GeminiLiveEngine(
            on_event=self._on_engine_event,
            system_prompt=system_prompt,
        )
        await self._engine.start()

        # Inject greeting — face will be set by assistant_audio_started event
        if self._engine.is_running():
            await self._engine.inject_user_message(
                f"[SYSTEM] The user has just entered the room. Greet them warmly. "
                f"Your greeting line: {self._profile.greeting_on_wake}"
            )

    async def _sleep(self) -> None:
        log.info("mira.sleeping")
        if self._engine:
            await self._engine.stop()
            self._engine = None
        await self._router.set_idle()

    # ── engine event handler ──────────────────────────────────────────────────

    async def _on_engine_event(self, event: EngineEvent) -> None:
        match event.kind:
            case "assistant_text":
                if event.text:
                    spoken = await self._router.handle_assistant_text(event.text)
                    log.info("mira.spoke", text=spoken[:80])

            case "assistant_audio_started":
                await self._router.set_face("happy")

            case "assistant_audio_ended":
                await self._router.set_face("listening")

            case "user_transcript":
                if event.text:
                    log.info("mira.heard", text=event.text[:80])

            case "error":
                log.warning("mira.engine_error", error=str(event.error))


def run() -> None:
    orchestrator = MiraOrchestrator()
    asyncio.run(orchestrator.run())


if __name__ == "__main__":
    run()
