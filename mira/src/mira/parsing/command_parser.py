import json

from mira.arduino.commands import ArduinoCommand, validate
from mira.utils.logging import get_logger

log = get_logger(__name__)

SEPARATOR = "||"


def parse(text: str) -> tuple[str, ArduinoCommand]:
    """Split an LLM response into (spoken_text, arduino_commands).

    Expected format:
        That sounds lovely. || {"face": "happy", "led": "warm"}

    If no separator, returns (text, {}).
    If JSON is malformed, logs a warning and returns (text_before_separator, {}).
    """
    if SEPARATOR not in text:
        return text.strip(), {}

    spoken_part, _, json_part = text.partition(SEPARATOR)
    spoken = spoken_part.strip()

    try:
        raw = json.loads(json_part.strip())
        cmd = validate(raw)
        return spoken, cmd
    except (json.JSONDecodeError, ValueError) as e:
        log.warning("command_parser.parse_failed", error=str(e), raw=json_part[:100])
        return spoken, {}
