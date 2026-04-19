from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Awaitable, Callable


@dataclass
class EngineEvent:
    kind: str  # user_transcript | assistant_text | assistant_audio_started | assistant_audio_ended | error
    text: str | None = None
    audio_chunk: bytes | None = None
    error: Exception | None = None


EventCallback = Callable[[EngineEvent], Awaitable[None]]


class ConversationEngine(ABC):
    """Stable interface for all conversation engine implementations.

    Lifecycle: start() opens the session. Audio flows bidirectionally until
    stop() is called. Events are emitted via the callback registered at init.
    """

    def __init__(self, on_event: EventCallback) -> None:
        self._on_event = on_event

    @abstractmethod
    async def start(self) -> None:
        """Open the session. Begin mic capture and response playback."""

    @abstractmethod
    async def stop(self) -> None:
        """Close the session. Stop audio streams. Release all resources."""

    @abstractmethod
    async def send_contextual_update(self, text: str) -> None:
        """Inject a non-interrupting context note into the live conversation.

        Used for sensor changes, time-of-day updates, or carer notes.
        Must NOT be treated as a user turn — Gemini Live's text-send channel
        handles this without interrupting the audio stream.
        """

    @abstractmethod
    async def interrupt(self) -> None:
        """Stop the assistant speaking immediately.

        For Gemini Live this is a no-op — interruptions are handled natively
        via the WebSocket protocol. For the manual pipeline this cancels the
        ElevenLabs stream and re-enters LISTENING state.
        """

    @abstractmethod
    async def inject_user_message(self, text: str) -> None:
        """Inject a synthesised user turn, bypassing STT.

        Used by the pre-cached response flow when a phrase is matched locally
        and we want Gemini to respond as if the user said it.
        Engines may raise NotImplementedError if not supported.
        """

    @abstractmethod
    def is_running(self) -> bool:
        """True between start() and stop()."""
