from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Config(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="MIRA_", env_file=".env", extra="ignore")

    # API
    gemini_api_key: str = ""

    # Hardware
    serial_port: str = "/dev/ttyUSB0"
    serial_baud: int = 115200
    mock_arduino: bool = True

    # Paths
    person_profile: Path = Path("assets/profile.json")
    memory_path: Path = Path("data/memory.json")

    # Presence timing
    awake_to_dormant_seconds: int = 120
    dormant_to_asleep_seconds: int = 300

    # Audio
    audio_sample_rate: int = 16000
    audio_frame_ms: int = 20

    # Gemini Live
    gemini_model: str = "gemini-2.5-flash-native-audio-latest"
    gemini_voice: str = "Aoede"
    gemini_temperature: float = 0.7
    gemini_max_output_tokens: int = 100

    # Behavior
    servo_rate_limit_seconds: float = 1.0  # min gap between servo moves
    greeting_on_wake: str = "Hello, dear. I'm here."

    # Logging
    log_level: str = "INFO"
    transcript_dir: Path = Path("data/transcripts")


_config: Config | None = None


def get_config() -> Config:
    global _config
    if _config is None:
        _config = Config()
    return _config
