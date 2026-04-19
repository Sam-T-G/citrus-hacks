from mira.arduino.commands import ArduinoCommand
from mira.arduino.serial_bridge import SerialBridge
from mira.parsing.command_parser import parse
from mira.utils.logging import get_logger

log = get_logger(__name__)

# Default commands to send when Mira speaks vs. when she's idle
_SPEAKING_DEFAULTS: ArduinoCommand = {"face": "happy", "led": "warm"}
_IDLE_DEFAULTS:     ArduinoCommand = {"face": "calm",  "led": "warm"}


class BehaviorRouter:
    """Routes engine events → Arduino commands + logs actions.

    Parses the LLM text response (spoken text || JSON), sends commands to the
    bridge, and returns the clean spoken portion for downstream use.
    """

    def __init__(self, bridge: SerialBridge) -> None:
        self._bridge = bridge

    async def handle_assistant_text(self, raw_text: str) -> str:
        """Parse response, dispatch commands, return spoken text."""
        spoken, cmd = parse(raw_text)

        # Command fires at turn_complete (after audio), so default to idle state
        if not cmd:
            cmd = _IDLE_DEFAULTS.copy()

        await self._send(cmd)
        log.debug("router.dispatched", spoken=spoken[:60], cmd=cmd)
        return spoken

    async def set_idle(self) -> None:
        await self._send(_IDLE_DEFAULTS)

    async def set_face(self, face: str) -> None:
        await self._send({"face": face})  # type: ignore[typeddict-item]

    async def _send(self, cmd: ArduinoCommand) -> None:
        if self._bridge.is_connected:
            await self._bridge.send(**cmd)
        else:
            log.debug("router.bridge_not_connected", cmd=cmd)
