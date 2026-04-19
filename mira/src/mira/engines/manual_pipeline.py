from mira.engines.base import ConversationEngine, EventCallback


class ManualPipelineEngine(ConversationEngine):
    """Fallback engine stub — raises NotImplementedError on all operations.

    Placeholder for a future STT → LLM → TTS pipeline that doesn't rely on
    Gemini Live, useful if the Live API is unavailable or for testing.
    """

    def __init__(self, on_event: EventCallback, system_prompt: str) -> None:
        super().__init__(on_event)

    async def start(self) -> None:
        raise NotImplementedError("ManualPipelineEngine not yet implemented")

    async def stop(self) -> None:
        pass

    async def send_contextual_update(self, text: str) -> None:
        raise NotImplementedError

    async def interrupt(self) -> None:
        raise NotImplementedError

    async def inject_user_message(self, text: str) -> None:
        raise NotImplementedError

    def is_running(self) -> bool:
        return False
