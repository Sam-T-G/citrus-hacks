from typing import Literal, TypedDict


FaceType    = Literal["calm", "happy", "thinking", "sleepy", "listening"]
LedMode     = Literal["warm", "cool", "off"]
ScreenState = Literal["off"]

VALID_FACES: set[str] = {"calm", "happy", "thinking", "sleepy", "listening"}
VALID_LEDS:  set[str] = {"warm", "cool", "off"}


class ArduinoCommand(TypedDict, total=False):
    face:    FaceType
    led:     LedMode
    servo:   int       # 0–180
    chime:   int       # any value triggers a chime
    photo:   str       # BMP filename on SD card
    caption: str       # overlay text under photo
    screen:  ScreenState


def validate(cmd: dict) -> ArduinoCommand:
    """Validate and return a typed ArduinoCommand. Raises ValueError on bad values."""
    known = {"face", "led", "servo", "chime", "photo", "caption", "screen"}
    unknown = cmd.keys() - known
    if unknown:
        raise ValueError(f"Unknown command keys: {unknown}")

    out: ArduinoCommand = {}

    if "face" in cmd:
        if cmd["face"] not in VALID_FACES:
            raise ValueError(f"Invalid face: {cmd['face']!r}. Must be one of {VALID_FACES}")
        out["face"] = cmd["face"]

    if "led" in cmd:
        if cmd["led"] not in VALID_LEDS:
            raise ValueError(f"Invalid led: {cmd['led']!r}. Must be one of {VALID_LEDS}")
        out["led"] = cmd["led"]

    if "servo" in cmd:
        angle = int(cmd["servo"])
        if not (0 <= angle <= 180):
            raise ValueError(f"servo must be 0–180, got {angle}")
        out["servo"] = angle

    if "chime" in cmd:
        out["chime"] = int(cmd["chime"])

    if "photo" in cmd:
        out["photo"] = str(cmd["photo"])

    if "caption" in cmd:
        out["caption"] = str(cmd["caption"])

    if "screen" in cmd:
        if cmd["screen"] != "off":
            raise ValueError(f"screen must be 'off', got {cmd['screen']!r}")
        out["screen"] = "off"

    return out
