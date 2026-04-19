# Mira — Dementia Companion Robot
## Software Implementation Plan

> A comprehensive software plan for Claude Code. Primary path: Gemini Live. Modular architecture preserves the option to swap in a manual pipeline (Silero VAD + Whisper + Gemini + ElevenLabs TTS) later without touching the rest of the system.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Design Principles](#3-design-principles)
4. [Technology Stack](#4-technology-stack)
5. [Project Structure](#5-project-structure)
6. [Module Specifications](#6-module-specifications)
7. [Serial Protocol (Arduino Interface)](#7-serial-protocol-arduino-interface)
8. [Arduino Team Brief](#8-arduino-team-brief)
9. [System Prompts](#9-system-prompts)
10. [Implementation Phases](#10-implementation-phases)
11. [Testing Strategy](#11-testing-strategy)
12. [Deployment & Operations](#12-deployment--operations)
13. [Future Work — Manual Pipeline Swap](#13-future-work--manual-pipeline-swap)
14. [Appendices](#14-appendices)

---

## 1. Executive Summary

### What we're building
A warm, patient, voice-driven companion robot for an elderly person with early-to-mid stage dementia. The robot listens, responds conversationally, displays face expressions and family photos on a TFT screen, and orients its head toward the person. Built on cardboard, tethered by USB to a host computer.

### Primary audio path
Google's **Gemini Live API** handles the full audio pipeline: automatic speech recognition, turn-taking, reasoning, and text-to-speech in a single bidirectional WebSocket session. This eliminates the need for separate VAD, STT, and TTS components and — critically — provides semantic turn-taking that handles the mid-sentence pauses and trailing-off speech characteristic of dementia users.

### Modularity commitment
The conversation engine sits behind a stable interface. If Gemini Live's voice warmth proves insufficient in long-term user testing, or if cost/reliability requirements change, we can swap to a manual pipeline (Silero VAD → Whisper → Gemini text → ElevenLabs TTS) without modifying any other system component. This is a first-class design requirement, not an afterthought.

### Split of responsibility
- **Host computer (this codebase)**: audio, reasoning, memory, sensor interpretation, command dispatch
- **Arduino Mega 2560 (separate team)**: sensor polling, signal filtering, physical output execution (TFT, servo, LEDs, piezo)

### Scope of this document
This document specifies the complete host-computer software. Arduino firmware is scoped at the protocol boundary — Section 8 is the brief for the Arduino team.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                          HOST COMPUTER                          │
│                                                                 │
│  ┌─────────────────┐      ┌──────────────────────────────────┐  │
│  │   Microphone    │─────▶│    ConversationEngine (iface)    │  │
│  │                 │      │  ┌────────────────────────────┐  │  │
│  └─────────────────┘      │  │    GeminiLiveEngine (v1)   │  │  │
│                           │  │    ManualPipeline (v2)     │  │  │
│  ┌─────────────────┐      │  └────────────────────────────┘  │  │
│  │     Speaker     │◀─────│                                  │  │
│  └─────────────────┘      └────┬─────────────────────────────┘  │
│                                │                                │
│                                ▼                                │
│                     ┌──────────────────────┐                    │
│                     │   CommandParser      │                    │
│                     │  (extracts {...}     │                    │
│                     │   from responses)    │                    │
│                     └──────┬───────────────┘                    │
│                            │                                    │
│   ┌────────────────────┐   │   ┌──────────────────────────────┐ │
│   │   PresenceManager  │───┼──▶│     BehaviorRouter           │ │
│   │  (PIR/prox logic)  │   │   │  (orchestrates commands,     │ │
│   └────────────────────┘   │   │   timers, sensor reactions)  │ │
│                            │   └───────┬──────────────────────┘ │
│   ┌────────────────────┐   │           │                        │
│   │   MemoryStore      │◀──┴──────────▶│                        │
│   │  (persistent)      │               │                        │
│   └────────────────────┘               ▼                        │
│                                ┌───────────────────┐            │
│                                │   SerialBridge    │            │
│                                │  (USB to Arduino) │            │
│                                └─────────┬─────────┘            │
└──────────────────────────────────────────┼──────────────────────┘
                                           │
                              USB serial   │  JSON @ 115200 baud
                                           │
┌──────────────────────────────────────────▼──────────────────────┐
│                      ARDUINO MEGA 2560                          │
│                                                                 │
│   Sensors: HC-SR04 · SR501 · TMP36                              │
│   Outputs: 4" TFT · Servo · Warm/Cool LEDs · Piezo · SD card    │
└─────────────────────────────────────────────────────────────────┘
```

### Key data flows

**Person speaks → Mira responds (primary flow)**
1. Mic audio streams into `ConversationEngine`
2. Engine handles turn detection, STT, reasoning, TTS internally (Gemini Live)
3. As the engine emits text (alongside audio to speaker), `CommandParser` extracts any `{...}` command blocks
4. Extracted commands flow to `BehaviorRouter`, which dispatches to `SerialBridge`
5. Arduino executes physical commands (face, servo, LED, photo, chime)

**Arduino sensor update → context injection**
1. Arduino broadcasts `{"temp":..., "prox":..., "pir":...}` every ~100ms
2. `SerialBridge` callback fires
3. `BehaviorRouter` runs sensor-driven reactions (servo tracking on proximity change, sleep on sustained no-motion)
4. `PresenceManager` decides wake/sleep state
5. When conversation is active, sensor changes are injected into `ConversationEngine` as contextual updates (non-interrupting)

**Presence-driven wake/sleep**
1. PIR goes HIGH after dormant period → `PresenceManager.on_motion()`
2. Triggers `wake()`: chime, LED warm-up, face to calm, start ConversationEngine session
3. No motion for N minutes → `sleep()`: screen off, LED off, close ConversationEngine session

---

## 3. Design Principles

### 3.1 Arduino is a dumb peripheral
The Arduino has zero knowledge of Gemini, conversation state, emotional context, or memory. It reads sensors, filters their signals, and executes arrival commands. All decision-making lives on the host. This keeps Arduino firmware stable as software iterates.

### 3.2 The engine interface is sacred
Everything that talks to the conversation engine goes through a single abstract interface (`ConversationEngine`). Adding a new engine implementation (e.g., `ManualPipelineEngine`) must not require changes to `main.py`, `behavior_router.py`, `serial_bridge.py`, or any other module. This is verifiable via type checking.

### 3.3 User-first means dementia-first
Every behavior defaults to the safer, slower, warmer option. Never cut off the user. Never correct. Never express frustration. Never surprise. Consistency is safety.

### 3.4 Fail visibly but gently
If Gemini Live drops, Mira says "One moment, dear" in a pre-recorded fallback, then reconnects. If the Arduino disconnects, log but don't crash — the conversation can continue without physical output. Errors must never be silently swallowed in a way that leaves the user confused.

### 3.5 Asyncio throughout
Single-threaded async/await everywhere. No threading, no multiprocessing. The audio engine, serial bridge, and behavior router all run on one event loop. This keeps concurrency reasoning simple and eliminates entire classes of bugs (race conditions, GIL contention, callback hell).

### 3.6 Configuration over code
Voice selection, silence thresholds, person profile, photo filenames, system prompts — all tunable via `config.py` and `.env`. No code changes required to adapt Mira to a different user.

### 3.7 Observability is a first-class feature
Structured logging at every boundary. Latency measurements at every pipeline stage. Session transcripts saved for review. Care-setting deployments will need audit trails.

---

## 4. Technology Stack

| Layer | Choice | Rationale |
|---|---|---|
| Language | Python 3.11+ | Best audio ecosystem, best Gemini SDK support, team familiarity |
| Async runtime | `asyncio` (stdlib) | Single concurrency model for all I/O |
| LLM | `gemini-2.0-flash-live-001` | Live API with audio in/out, semantic turn-taking |
| Gemini SDK | `google-genai` (v1.x) | Official, supports Live API |
| Audio I/O | `sounddevice` + `numpy` | Low-latency mic capture and speaker playback |
| Serial | `pyserial` + `pyserial-asyncio` | Arduino communication |
| Config | `pydantic-settings` | Typed config, env var support |
| Logging | `structlog` | Structured, contextual logs |
| Testing | `pytest` + `pytest-asyncio` | Async test support |
| Process mgmt | `systemd` (Linux) / `launchd` (macOS) | Autostart at boot |

### Why not TypeScript
The audio layer (VAD, potential fallback STT, audio device management) has mature Python libraries and weaker TypeScript equivalents. The performance requirements are modest, and Python's typing (with `mypy --strict`) is more than sufficient for a project of this scale.

### Why Gemini Live over full ElevenLabs Agents
ElevenLabs Agents' per-minute pricing is prohibitive for a companion used hours daily. Gemini Live's per-token pricing scales better, and its voice quality — while not matching ElevenLabs — is sufficient for the dementia care context where voice warmth matters but is not the only factor. The semantic turn-taking advantage outweighs the voice warmth differential.

---

## 5. Project Structure

```
mira/
├── README.md
├── pyproject.toml                 # Dependencies, lint config, entry point
├── .env.example                   # Template for secrets
├── .gitignore
│
├── src/mira/
│   ├── __init__.py
│   ├── main.py                    # Entry point, orchestrator
│   ├── config.py                  # All tunable parameters
│   │
│   ├── engines/                   # Conversation engines (swappable)
│   │   ├── __init__.py
│   │   ├── base.py                # ConversationEngine abstract interface
│   │   ├── gemini_live.py         # Primary implementation
│   │   └── manual_pipeline.py     # Future: Silero + Whisper + Gemini + EL
│   │
│   ├── audio/                     # Audio device abstraction
│   │   ├── __init__.py
│   │   ├── devices.py             # Mic/speaker selection
│   │   └── player.py              # Streaming audio playback
│   │
│   ├── arduino/                   # Arduino integration
│   │   ├── __init__.py
│   │   ├── serial_bridge.py       # pyserial-asyncio wrapper
│   │   ├── commands.py            # Typed command definitions
│   │   └── mock.py                # In-memory mock for testing
│   │
│   ├── behavior/                  # Behavior logic
│   │   ├── __init__.py
│   │   ├── router.py              # BehaviorRouter — sensor reactions, command dispatch
│   │   ├── presence.py            # PresenceManager — wake/sleep via PIR
│   │   └── cache.py               # Pre-cached responses for common phrases
│   │
│   ├── memory/                    # Persistent state
│   │   ├── __init__.py
│   │   ├── store.py               # MemoryStore
│   │   └── profile.py             # Person profile loading
│   │
│   ├── parsing/                   # Response parsing
│   │   ├── __init__.py
│   │   └── command_parser.py      # Extract {..} blocks from LLM output
│   │
│   ├── prompts/                   # LLM prompts
│   │   ├── __init__.py
│   │   ├── system.py              # Main system prompt
│   │   └── examples.py            # Few-shot examples
│   │
│   └── utils/
│       ├── __init__.py
│       ├── logging.py             # structlog config
│       └── metrics.py             # Latency tracking
│
├── tests/
│   ├── conftest.py
│   ├── test_command_parser.py
│   ├── test_serial_bridge.py
│   ├── test_behavior_router.py
│   ├── test_presence.py
│   ├── test_memory.py
│   └── integration/
│       ├── test_engine_swap.py    # Verifies interface contract across engines
│       └── test_arduino_mock.py   # Uses mock Arduino
│
├── assets/
│   └── photos/
│       ├── README.md              # Format requirements + batch convert script
│       └── .gitkeep
│
├── docs/
│   ├── architecture.md            # Expanded architecture reference
│   ├── serial_protocol.md         # Arduino protocol spec (shared with Arduino team)
│   ├── arduino_brief.md           # Brief for Arduino team
│   ├── switching_engines.md       # How to swap engines
│   ├── prompting.md               # System prompt design, tuning
│   ├── deployment.md              # Running, autostart, logs
│   ├── testing.md                 # Test strategy, manual test script
│   └── troubleshooting.md         # Common issues
│
└── scripts/
    ├── prepare_photos.sh          # Batch convert JPG → 480x320 BMP
    ├── list_audio_devices.py      # Help pick the right mic/speaker
    └── test_arduino.py            # CLI to send commands manually
```

---

## 6. Module Specifications

Each module below is specified with its responsibility, public interface, key design decisions, dependencies, and acceptance criteria. Claude Code should implement modules in the order dictated by Section 10 (Implementation Phases).

---

### 6.1 `engines/base.py` — ConversationEngine abstract interface

**Responsibility**: Define the stable contract between the conversation layer and the rest of the system. Both `GeminiLiveEngine` and `ManualPipelineEngine` implement this.

**Interface**:

```python
from abc import ABC, abstractmethod
from typing import Awaitable, Callable, Protocol
from dataclasses import dataclass


@dataclass
class EngineEvent:
    """Event emitted by the engine during a session."""
    kind: str  # "user_transcript" | "assistant_text" | "assistant_audio_started" | "assistant_audio_ended" | "error"
    text: str | None = None
    audio_chunk: bytes | None = None
    error: Exception | None = None


class ConversationEngine(ABC):
    """Abstract base for audio conversation engines.

    Lifecycle: start() opens the session. Audio flows bidirectionally until
    stop() is called. Events are emitted via the callback registered in __init__.
    """

    def __init__(self, on_event: Callable[[EngineEvent], Awaitable[None]]):
        self._on_event = on_event

    @abstractmethod
    async def start(self) -> None:
        """Open the conversation session. Begin mic capture and response playback."""

    @abstractmethod
    async def stop(self) -> None:
        """Close the session. Stop audio streams. Release resources."""

    @abstractmethod
    async def send_contextual_update(self, text: str) -> None:
        """Inject a non-interrupting context note into the conversation.

        Used for sensor data ('Margaret is sitting closer now'), time context,
        or carer notes. The engine must NOT treat this as a user turn.
        """

    @abstractmethod
    async def interrupt(self) -> None:
        """Stop the assistant speaking immediately. Used when user starts speaking
        (manual pipeline) or when Arduino signals presence change mid-speech.

        For Gemini Live this is a no-op since interruptions are handled natively.
        """

    @abstractmethod
    async def inject_user_message(self, text: str) -> None:
        """Inject a synthesised user turn. Used for the pre-cached response flow —
        we've matched a cached phrase, we want the engine to respond as if the
        user spoke it, but skip STT.

        Optional: engines may return NotImplementedError if not supported.
        """

    @abstractmethod
    def is_running(self) -> bool:
        """True between start() and stop()."""
```

**Acceptance criteria**:
- Full type hints, passes `mypy --strict`
- Docstring on every method explaining the contract
- No Gemini-specific or ElevenLabs-specific types leak into this interface

---

### 6.2 `engines/gemini_live.py` — GeminiLiveEngine (primary)

**Responsibility**: Implement `ConversationEngine` using Google's Gemini Live API. Handles the WebSocket session, bidirectional audio streaming, and event emission.

**Key design decisions**:
- Uses `google-genai` async client with `live.connect()`
- Mic audio streams in 20ms PCM16 frames at 16kHz
- Speaker playback uses a queue that the engine feeds; playback runs in a dedicated coroutine
- Text transcripts arrive in `model_turn.parts` alongside audio — `CommandParser` receives them via `on_event` callback
- On connection drop: automatic reconnect with exponential backoff (1s, 2s, 4s, 8s, max 30s), up to 5 attempts. User hears fallback audio ("One moment, dear") during reconnect.
- `send_contextual_update()` uses the Live API's text-send channel (non-audio input) which doesn't interrupt the conversation

**Critical implementation notes**:

```python
# Session config — document rationale inline
SESSION_CONFIG = {
    "response_modalities": ["AUDIO", "TEXT"],  # Need TEXT for command parsing
    "speech_config": {
        "voice_config": {
            "prebuilt_voice_config": {"voice_name": "Aoede"}  # Warmest available
        },
        "language_code": "en-US",
    },
    "system_instruction": None,  # Injected at runtime from prompts/system.py
    "generation_config": {
        "temperature": 0.7,
        "max_output_tokens": 100,   # Enforce short responses
    },
}

AUDIO_SAMPLE_RATE = 16000
AUDIO_FRAME_MS = 20
AUDIO_FRAME_SIZE = int(AUDIO_SAMPLE_RATE * AUDIO_FRAME_MS / 1000)  # 320 samples
```

**Required behaviors**:
1. Start session → connect WebSocket → begin mic → begin playback coroutine
2. Every mic frame → send as `realtime_input.audio`
3. Every response message → route audio chunks to player, text to `on_event`
4. On speaker audio_started / audio_ended → emit events (for UI/state)
5. Gracefully handle network drops with reconnect
6. On `stop()`: flush playback queue, close WebSocket, stop mic stream

**Dependencies**:
- `google-genai`
- `sounddevice` (via `audio/devices.py` and `audio/player.py`)

**Acceptance criteria**:
- Can hold a 30-minute conversation without leak or drift
- Reconnects cleanly from a simulated network drop
- Emits `user_transcript`, `assistant_text`, `assistant_audio_started`, `assistant_audio_ended` events correctly
- `send_contextual_update()` does not interrupt mid-speech (verify with manual test)

---

### 6.3 `engines/manual_pipeline.py` — ManualPipelineEngine (stub)

**Responsibility**: Placeholder implementation that raises `NotImplementedError` on instantiation but defines the class structure needed for future implementation.

**Purpose**: Forces the abstract interface to be adequate for the eventual manual pipeline. If implementing this stub reveals the interface is missing something, fix the interface now — not when we swap.

**Stub content**:

```python
class ManualPipelineEngine(ConversationEngine):
    """Future implementation: Silero VAD → Whisper → Gemini text → ElevenLabs TTS.

    See docs/switching_engines.md for the implementation plan.
    Currently a stub that raises NotImplementedError.
    """

    def __init__(self, on_event, *, gemini_api_key: str, elevenlabs_api_key: str, voice_id: str):
        super().__init__(on_event)
        # Store config, do NOT initialize clients yet
        raise NotImplementedError(
            "ManualPipelineEngine is a stub. See docs/switching_engines.md."
        )

    # ... all abstract methods raise NotImplementedError
```

**Acceptance criteria**:
- Class exists, imports cleanly, passes type checking
- Raising `NotImplementedError` in `__init__` is the only runtime behavior
- Documented plan in `docs/switching_engines.md` for completing the implementation

---

### 6.4 `audio/devices.py` + `audio/player.py` — Audio I/O

**Responsibility**: Abstract the audio device layer away from engines. Lets us swap mic/speaker devices and handle playback queueing in one place.

**`audio/devices.py` interface**:

```python
@dataclass
class AudioDevice:
    index: int
    name: str
    channels: int
    sample_rate: int

def list_input_devices() -> list[AudioDevice]: ...
def list_output_devices() -> list[AudioDevice]: ...
def get_default_input() -> AudioDevice: ...
def get_default_output() -> AudioDevice: ...

class MicStream:
    """Async context manager yielding 20ms PCM16 frames at 16kHz."""
    def __init__(self, device: AudioDevice | None = None): ...
    async def __aenter__(self) -> "MicStream": ...
    async def __aexit__(self, *args) -> None: ...
    async def frames(self) -> AsyncIterator[bytes]: ...
```

**`audio/player.py` interface**:

```python
class StreamingPlayer:
    """Async speaker player that accepts raw PCM chunks and plays them in order.

    Internal queue; playback runs in a background task. write() is non-blocking.
    """
    def __init__(self, sample_rate: int, device: AudioDevice | None = None): ...
    async def start(self) -> None: ...
    async def stop(self) -> None: ...
    async def write(self, pcm: bytes) -> None: ...
    async def flush(self) -> None: ...
    async def clear(self) -> None:
        """Clear pending audio immediately — for interruption handling."""
```

**Acceptance criteria**:
- List functions return populated lists on macOS, Linux, Windows
- MicStream yields correctly-sized frames (640 bytes = 320 samples × 2 bytes)
- Player.clear() halts playback within one frame (~20ms)
- No audio glitches during 30-minute test playback

---

### 6.5 `arduino/serial_bridge.py` — SerialBridge

**Responsibility**: Async wrapper around `pyserial-asyncio`. Reads sensor JSON from Arduino, sends command JSON to Arduino. Thread-safe (via asyncio lock).

**Interface**:

```python
@dataclass
class SensorReading:
    temp: float       # Celsius
    prox: float       # cm
    pir: bool         # motion detected
    raw: dict         # original JSON for logging

class SerialBridge:
    def __init__(
        self,
        port: str,
        baud: int = 115200,
        on_sensor: Callable[[SensorReading], Awaitable[None]] | None = None,
    ): ...

    async def connect(self) -> None: ...
    async def disconnect(self) -> None: ...

    async def send(self, **kwargs) -> None:
        """Send a JSON command. Raises if not connected.

        Examples:
            await bridge.send(face="happy")
            await bridge.send(photo="sarah.bmp", caption="Sarah, 1987")
        """

    @property
    def latest(self) -> SensorReading | None:
        """Most recent sensor reading, or None if never received."""

    @property
    def is_connected(self) -> bool: ...
```

**Key design decisions**:
- Background reader task parses lines as they arrive, calls `on_sensor` callback
- Malformed JSON is logged at WARNING level and discarded — never crashes
- Serial disconnect triggers auto-reconnect with 2-second polling
- `send()` uses asyncio lock to serialize writes

**Acceptance criteria**:
- Survives Arduino unplug → replug without manual intervention
- No sensor data is lost under normal load (10 Hz broadcast)
- Command `send()` latency < 10ms from call to bytes on wire

---

### 6.6 `arduino/commands.py` — Typed command definitions

**Responsibility**: Single source of truth for what commands are valid. Used by `BehaviorRouter` for type safety, by tests for validation, and by the system prompt for generation.

```python
from typing import Literal, TypedDict

FaceType     = Literal["calm", "happy", "thinking", "sleepy", "listening"]
LedMode      = Literal["warm", "cool", "off"]
ScreenState  = Literal["off"]

class ArduinoCommand(TypedDict, total=False):
    face: FaceType
    led: LedMode
    servo: int          # 0-180
    chime: int          # any value triggers
    photo: str          # filename on SD
    caption: str        # companion to photo
    screen: ScreenState

def validate(cmd: dict) -> ArduinoCommand:
    """Raise ValueError if cmd contains unknown keys or invalid values."""
```

---

### 6.7 `arduino/mock.py` — In-memory Arduino mock

**Responsibility**: Implement the same `SerialBridge` interface without real hardware. Used for tests and for running Mira without a physical Arduino attached.

**Must**:
- Accept commands and log them
- Emit synthetic sensor readings on a configurable schedule
- Simulate PIR transitions for presence tests

---

### 6.8 `behavior/router.py` — BehaviorRouter

**Responsibility**: The decision layer between raw inputs (sensor data, LLM commands) and the Arduino. Handles:
- Dispatching LLM-generated commands to Arduino
- Reactive behaviors on sensor changes (servo tracking, etc.)
- Timed sequences (photo → wait 20s → return to face)
- Routing command timing (some commands execute before audio plays, some during)

**Interface**:

```python
class BehaviorRouter:
    def __init__(self, bridge: SerialBridge, memory: MemoryStore, config: Config): ...

    async def on_commands(self, commands: ArduinoCommand) -> None:
        """Dispatch LLM-generated commands to Arduino."""

    async def on_sensor_update(self, reading: SensorReading) -> None:
        """React to sensor changes that don't require LLM.

        Examples:
          - Proximity < 60cm → servo 110 (lean toward)
          - Proximity > 120cm → servo 90 (face forward)
          - Rapid prox decrease → pre-emptive face "listening"
        """

    async def on_speech_onset(self) -> None:
        """Engine detected user started speaking.

        Quick reaction: face listening, servo slight turn.
        """

    async def on_speech_end(self) -> None:
        """Engine detected user finished speaking.

        Quick reaction: face thinking (while Gemini processes).
        """

    def register_timed_action(self, delay: float, action: Callable[[], Awaitable[None]]) -> None:
        """Schedule a one-shot action after delay seconds. Cancel previous pending."""
```

**Key design decisions**:
- Only one "pending timed action" at a time — a new photo cancels the previous auto-return
- Servo movements are rate-limited (no more than 1 change per second) to prevent jitter from sensor noise
- Commands from LLM take priority over sensor-driven behaviors when they overlap

---

### 6.9 `behavior/presence.py` — PresenceManager

**Responsibility**: Manage the wake/sleep state of Mira based on PIR and proximity. Coordinates startup and shutdown of the ConversationEngine.

**States**:
- `ASLEEP` — no engine session, screen off, LEDs off
- `WAKING` — transitioning; chime, LED fade, screen on, greeting
- `AWAKE` — engine session active, normal conversation
- `DORMANT` — engine still running but idle (no recent motion); preps to sleep

**Transitions**:
```
ASLEEP ──motion──▶ WAKING ──greeting complete──▶ AWAKE
AWAKE ──no motion N min──▶ DORMANT ──no motion M min──▶ ASLEEP
DORMANT ──motion──▶ AWAKE
WAKING ──stop()──▶ ASLEEP  (immediate on shutdown signal)
```

**Interface**:

```python
class PresenceManager:
    def __init__(
        self,
        engine: ConversationEngine,
        bridge: SerialBridge,
        config: Config,
    ): ...

    async def start(self) -> None: ...
    async def stop(self) -> None: ...

    @property
    def state(self) -> Literal["asleep", "waking", "awake", "dormant"]: ...

    async def handle_sensor_update(self, reading: SensorReading) -> None:
        """Called on every sensor reading. Drives state transitions."""
```

**Tunable parameters** (in `config.py`):
- `AWAKE_TO_DORMANT_SECONDS = 120`  — 2 min of no motion
- `DORMANT_TO_ASLEEP_SECONDS = 300` — 5 more min of no motion
- `GREETING_ON_WAKE = "Hello, dear. I'm here."`

---

### 6.10 `memory/store.py` — MemoryStore

**Responsibility**: Persistent state across sessions. Carer notes, daily summaries, mood log, recent conversation highlights. JSON file on disk.

**Interface**:

```python
class MemoryStore:
    def __init__(self, path: Path): ...

    # Session lifecycle
    async def start_session(self) -> str:
        """Begin a session. Returns session ID."""
    async def end_session(self, summary: str) -> None: ...

    # Carer notes
    async def add_carer_note(self, note: str) -> None: ...
    def latest_carer_note(self) -> str | None: ...

    # Mood log
    async def log_mood(self, mood: str, context: str | None = None) -> None: ...

    # Context builder for LLM
    def build_context_note(self) -> str:
        """Returns a multi-line string suitable for injecting into the system prompt.

        Includes: last session date, yesterday's summary, current carer note,
        recent mood trajectory.
        """
```

**Storage format** (human-readable for review):

```json
{
  "sessions": [
    {"id": "...", "started": "2026-01-15T09:23:00", "ended": "...", "summary": "..."}
  ],
  "carer_notes": [
    {"date": "2026-01-15", "note": "Had a difficult morning. Seemed disoriented."}
  ],
  "mood_log": [
    {"timestamp": "...", "mood": "content", "context": "talking about garden"}
  ]
}
```

**Retention**:
- Last 30 days of sessions
- Last 50 carer notes
- Last 500 mood entries

---

### 6.11 `parsing/command_parser.py` — CommandParser

**Responsibility**: Extract Arduino commands embedded in LLM responses. Gemini is prompted to format responses as:

```
<spoken text>  || {"face": "happy", "led": "warm"}
```

**Interface**:

```python
def parse(text: str) -> tuple[str, ArduinoCommand]:
    """Return (spoken_text, commands).

    If no || separator, returns (text, {}).
    If JSON after || is malformed, logs warning and returns (text before ||, {}).
    """
```

**Design notes**:
- Uses `json.loads` on the post-`||` substring after trimming
- Validates against `commands.py` schema; logs warnings for unknown keys
- Must be robust to Gemini occasionally omitting the separator or emitting trailing text after the JSON

---

### 6.12 `prompts/system.py` — System prompts

**Responsibility**: Build the system prompt dynamically from person profile, memory context, and static personality instructions. This is where Mira's personality lives.

```python
def build_system_prompt(
    profile: PersonProfile,
    memory_context: str,
    current_time: datetime,
) -> str: ...
```

**See Section 9** for the actual prompt content.

---

### 6.13 `main.py` — Orchestrator

**Responsibility**: Entry point. Wire everything together. Handle startup, signal handlers, graceful shutdown.

**Startup sequence**:
1. Load config
2. Configure logging
3. Load memory store
4. Connect SerialBridge (or use mock if configured)
5. Build prompts
6. Instantiate ConversationEngine (Gemini Live by default)
7. Instantiate BehaviorRouter, CommandParser
8. Instantiate PresenceManager; it starts in ASLEEP state
9. Register signal handlers (SIGINT, SIGTERM)
10. Run event loop until shutdown

**Shutdown sequence**:
1. PresenceManager transitions to ASLEEP
2. Engine.stop()
3. SerialBridge.send(led="off", screen="off", servo=90)
4. SerialBridge.disconnect()
5. MemoryStore.end_session(summary from Gemini)
6. Close log file handles

---

## 7. Serial Protocol (Arduino Interface)

> This section is the contract between the host and Arduino teams. Changes require mutual agreement.

### Transport
- USB serial
- Baud rate: **115200**
- Framing: newline-delimited JSON (`\n` terminates every message)
- Encoding: UTF-8

### Arduino → Host (sensor data)

Broadcast every **100 ms** while `mirasAwake == true`. Silent otherwise.

```json
{"temp": 21.4, "prox": 38.2, "pir": 1}
```

| Field | Type | Unit | Filter |
|---|---|---|---|
| `temp` | float | °C | EMA α=0.05 on TMP36 |
| `prox` | float | cm | EMA α=0.25 on HC-SR04 ping_cm; held at last value if out-of-range |
| `pir` | int (0/1) | — | Raw digital read on SR501 |

### Host → Arduino (commands)

Event-driven. Keys may be combined. Arduino ignores unknown keys.

```json
{"face": "happy", "led": "warm", "servo": 110, "chime": 1}
```

| Key | Type | Values | Behavior |
|---|---|---|---|
| `face` | string | `calm`, `happy`, `thinking`, `sleepy`, `listening` | Draw emotion on TFT |
| `led` | string | `warm`, `cool`, `off` | PWM warm or cool LED |
| `servo` | int | 0–180 | Target angle; smooth move at 1°/15ms |
| `chime` | int | any | Play 3-tone ascending chime on piezo |
| `photo` | string | filename on SD | Render 480×320 BMP |
| `caption` | string | text | Overlay on photo, bottom of screen |
| `screen` | string | `off` | Backlight off until next face/photo command |

### Reliability expectations
- Arduino must not block the main loop for more than 20ms at any time (no `delay()`, no `pulseIn()` with default timeout)
- Arduino must silently discard malformed JSON and continue
- Host must silently discard malformed sensor JSON and continue
- Either side may reconnect without the other restarting

---

## 8. Arduino Team Brief

> This section is the full brief for the team building the Arduino firmware. Share with them directly.

### Your scope
You are building firmware for an Arduino Mega 2560 that:
1. Reads sensors and broadcasts their filtered values every 100ms
2. Accepts commands over USB serial and executes them on physical outputs
3. Manages wake/sleep state based on PIR sensor

### Your non-scope
- No AI, LLM, or conversational logic. Ever.
- No WiFi, Bluetooth, or cloud connectivity.
- No decision-making about what the robot should say or do. You receive commands; you execute them.

### Hardware (already selected)
- Arduino Mega 2560
- HC-SR04 ultrasonic sensor (proximity)
- SR501 PIR sensor (motion/presence)
- TMP36 analog temperature sensor
- 4" 480×320 TFT LCD, SPI interface, driver TBD (use MCUFRIEND_kbv to auto-detect)
- SD card module (for photo storage) — typically on the TFT shield
- SG90 servo (head orientation)
- 2× LEDs (warm amber, cool blue) with 220Ω current-limiting resistors
- Piezo buzzer
- Cardboard housing (physical assembly by a different team)

### Pin map — final

| Pin | Use |
|---|---|
| A2 | TMP36 temperature |
| D2 | HC-SR04 TRIG |
| D3 | HC-SR04 ECHO (interrupt-capable) |
| D4 | SD card CS |
| D5 | Piezo buzzer |
| D6 | LED warm (PWM) |
| D7 | LED cool (PWM) |
| D9 | TFT RST |
| D10 | TFT DC |
| D11 | SR501 PIR OUT |
| D22 | TFT CS |
| D23 | TFT backlight (PWM) |
| D44 | Servo (PWM) |
| D50 | SPI MISO |
| D51 | SPI MOSI |
| D52 | SPI SCK |

### Power
- USB-powered from the host computer. Total budget: ~450 mA.
- Current measured draw (all on): ~316 mA. Within budget.
- Keep TFT backlight off when idle (`analogWrite(TFT_BL, 0)`) — saves ~180 mA.
- Use software brightness limits to stay conservative.

### Required libraries
Install via Arduino IDE → Manage Libraries:
- `MCUFRIEND_kbv` by David Prentice
- `Adafruit GFX Library`
- `NewPing` by Tim Eckel (non-blocking ultrasonic)
- `ArduinoJson` by Benoit Blanchon (v6.x)
- `SD` (built-in)
- `Servo` (built-in)

### Critical correctness requirements
1. **The main loop must not block for more than 20ms.** This means: never use `delay()`, never use `pulseIn()` with default timeout. Use `NewPing.ping_cm()` (non-blocking) and `millis()`-based timing everywhere.
2. **Signal filtering must be in firmware.** Do not send raw sensor values to the host. Apply the EMA filters specified in Section 7.
3. **Wake/sleep state is your responsibility.** The host never tells you to wake or sleep. You drive this from the PIR sensor:
   - If `PIR HIGH` and `mirasAwake == false`: transition to awake (backlight on, chime, face draw, begin sensor broadcast)
   - If no PIR motion for 120 seconds: transition to asleep (backlight off, LEDs off, stop sensor broadcast)
4. **Sensor broadcast runs only while awake.** Serial is quiet when the room is empty.

### Face expressions — drawn on TFT
Draw five pixel-art emotion faces using filled shapes (circles for eyes, arcs for mouth). They should be:
- Warm skin color, dark eyes with catchlight
- Clearly readable from across a room
- Simple — a grandmother's doodle, not a realistic portrait
- Consistent — same eye position, same face outline, same proportions

States: `calm`, `happy`, `thinking`, `sleepy`, `listening`. Implement blinks every 4 seconds as a brief eye-close overlay.

See Section 6.10 in the host codebase's `displays.h` reference in the scaffold for pixel-accurate guidance. The host team will provide their reference implementation — feel free to adapt or rewrite.

### Photo display
When you receive a `photo` command:
1. Open the file from SD card root
2. Skip 54-byte BMP header
3. Read pixels row-by-row (BMP is bottom-up, 24-bit BGR)
4. Convert to RGB565 and write to TFT via `drawRGBBitmap`
5. If a `caption` is provided, overlay it at the bottom of the screen in white text on a black strip

### What to test before integration
- Face rendering works for all 5 expressions
- Photo loads correctly from SD (use a test BMP)
- Servo reaches 0°, 90°, and 180° smoothly (not jerky)
- LEDs warm and cool visibly at full brightness
- Piezo chime sounds gentle, not piercing
- PIR triggers wake from 2 meters away
- HC-SR04 reports sensible distances (10cm – 2m)
- Serial connection survives a host-side restart without Arduino reboot

### Tools to talk to Arduino without the host codebase
Run `scripts/test_arduino.py` from the host codebase. It's a REPL that lets you type commands and see sensor data. Use this to verify firmware behavior before integrating with the Python side.

### Where to ask questions
- Protocol questions (what does command X do): Section 7 of this doc is the source of truth
- Hardware questions: [hardware team lead]
- Integration questions: [host software team lead]

---

## 9. System Prompts

### Design philosophy

The system prompt is where Mira's personality lives. It must:
1. Enforce short responses (hard cap)
2. Forbid correction and impatience
3. Encourage reflection and warmth
4. Specify the exact response format for command parsing
5. Inject person-specific context

### Main system prompt

```python
def build_system_prompt(profile: PersonProfile, memory_context: str, now: datetime) -> str:
    return f"""
You are Mira, a warm and patient companion robot caring for {profile.name}, aged {profile.age}.
{profile.name} has {profile.condition}.

# Your manner

You speak slowly, clearly, and with genuine warmth. You are never in a hurry.
You never correct {profile.name}, never argue, never express impatience or confusion.
When {profile.name} seems confused, you gently reflect back what you heard without
drawing attention to the confusion. You never say "I don't understand" — instead you
say things like "That sounds lovely, tell me more" or "I heard you mention Sarah —
would you like to talk about her?"

You respond in ONE OR TWO SHORT SENTENCES. Never more. Never list things.
Never ask more than one question at a time.

# Response format

Every response has two parts separated by ||:
1. What you say aloud (plain warm conversational text)
2. A JSON object of commands to your body (optional, omit if no change needed)

Example responses:

  That sounds like a lovely afternoon. || {{"face":"happy","led":"warm"}}

  I hear you, dear. Tell me more about Sarah. || {{"face":"listening","servo":110}}

  Would you like to see a picture of her? || {{"face":"happy","photo":"sarah.bmp","caption":"Sarah, 1987"}}

  It's alright. We can just sit together for a bit. || {{"face":"calm"}}

# Available commands

  face: one of calm, happy, thinking, sleepy, listening
  led: one of warm, cool, off
  servo: integer 0-180 (head angle, 90 is center, 110 is slight turn toward person)
  chime: 1 (plays a soft tone)
  photo: filename of a photo on your SD card to show
  caption: text to show under the photo
  screen: "off" to turn your display off

# Photos available

{format_photos(profile.photos)}

# Context about {profile.name}

Name: {profile.name}
Age: {profile.age}
Key people: {", ".join(profile.key_people)}
Things {profile.name} enjoys talking about: {", ".join(profile.favourite_topics)}

# Recent context

{memory_context}

# The time right now

It is {now.strftime('%A, %B %-d, %Y, %-I:%M %p')}.

# Above all

Be present. Be warm. Be unhurried. Mira is company, not an information service.
Sometimes the best response is just acknowledgment.
""".strip()
```

### Contextual update format

When sensor state changes significantly, inject non-interrupting updates:

- `[{profile.name} is sitting closer now]`
- `[{profile.name} has moved further away]`
- `[{profile.name} has been still for a while]`
- `[It's now evening]`

### Prompt iteration
The prompt is version-controlled. Changes to personality should be reviewed carefully by the team — small wording shifts have significant behavioral effects. Keep a changelog in `docs/prompting.md`.

---

## 10. Implementation Phases

### Phase 0 — Project setup (Day 1)
- Initialise `pyproject.toml` with dependencies
- Configure `mypy`, `ruff`, `pytest`
- Create directory structure per Section 5
- Set up `.env.example` and config loader
- Configure `structlog`

**Verification**: `pytest` passes with empty test suite; `mypy src/` passes.

---

### Phase 1 — Serial bridge + Arduino mock (Days 2–3)

Implement:
- `arduino/commands.py` (type definitions)
- `arduino/serial_bridge.py` (real bridge)
- `arduino/mock.py` (in-memory mock)
- `tests/test_serial_bridge.py` (against mock)

Deliverable: `scripts/test_arduino.py` — interactive REPL that connects to real Arduino and lets you type commands, see sensor data.

**Verification**:
- Can connect to a real Arduino running the firmware stub
- Can send commands and see Arduino respond
- Mock passes same test suite as real bridge

**Dependency on Arduino team**: basic firmware that echoes commands and sends dummy sensor data.

---

### Phase 2 — Abstract engine + Gemini Live basic (Days 4–6)

Implement:
- `engines/base.py` (abstract interface, fully typed)
- `engines/gemini_live.py` (minimum viable: connect, stream audio in/out, emit transcript events)
- `engines/manual_pipeline.py` (stub raising NotImplementedError)
- `audio/devices.py`, `audio/player.py`

Deliverable: `scripts/test_engine.py` — runs an engine for 60 seconds, logs transcripts.

**Verification**:
- Can hold a conversation with Gemini Live through mic and speaker
- Transcripts arrive via events
- Clean shutdown

---

### Phase 3 — Command parsing + behavior router (Days 7–8)

Implement:
- `parsing/command_parser.py`
- `behavior/router.py`
- `prompts/system.py` (with hardcoded test profile)

Integration: wire engine events → parser → router → bridge.

**Verification**: Speaking to Mira triggers appropriate face/LED/servo changes on Arduino.

---

### Phase 4 — Presence management + memory (Days 9–10)

Implement:
- `behavior/presence.py`
- `memory/store.py`
- `memory/profile.py`

Integration: PresenceManager controls engine lifecycle; MemoryStore injects context at session start.

**Verification**:
- PIR HIGH triggers wake sequence (chime, greeting, face)
- No motion for configured duration triggers sleep
- Session summaries persist across restarts

---

### Phase 5 — Cached responses + sensor contextual updates (Day 11)

Implement:
- `behavior/cache.py` (common-phrase cache bypassing Gemini)
- Contextual update injection from `BehaviorRouter.on_sensor_update()`

**Verification**:
- "What time is it?" responds without Gemini API call (verify in logs)
- Proximity changes inject context that's visible in Gemini's response

---

### Phase 6 — Error handling + reconnection (Days 12–13)

Harden:
- Gemini Live reconnection with exponential backoff
- Serial reconnection on unplug/replug
- Fallback audio during network drop
- Graceful degradation if Arduino absent (log + continue)

**Verification**:
- Unplug Ethernet mid-conversation → Mira says "one moment" → reconnects → continues
- Unplug Arduino → logs error → conversation continues with no physical output → replug → resumes
- Kill and restart the Python process → MemoryStore has the last session's summary

---

### Phase 7 — Polish + tuning (Days 14–15)

- Audition Gemini voices, pick the one
- Tune speaking rate, temperature
- Refine system prompt based on observed conversations
- Latency profiling: log every stage with structlog, verify p95 < 2s
- Add metrics dashboard (simple CLI: `scripts/show_metrics.py`)

---

### Phase 8 — Deployment (Day 16)

- systemd service file
- Log rotation config
- Environment variables documented
- Runbook in `docs/deployment.md`
- Graceful handling of system sleep/wake (laptop lid close)

---

### Out-of-scope for initial release
- Manual pipeline implementation (see Section 13)
- Web dashboard for carers
- Multi-user support
- Remote carer notifications

---

## 11. Testing Strategy

### 11.1 Unit tests (`tests/`)
- Every module in isolation
- Heavy use of the Arduino mock — no real hardware required for unit tests
- Mock Gemini client for engine tests (use `unittest.mock`)
- Target: 80% line coverage

### 11.2 Interface contract test (`tests/integration/test_engine_swap.py`)

This is the critical test that keeps modularity honest. It should:
1. Instantiate `GeminiLiveEngine` with a fake Gemini server
2. Run a scripted conversation
3. Verify events emitted match expected sequence
4. Repeat with `ManualPipelineEngine` (once implemented)

If this test passes for both engines with the same assertions, the interface is doing its job.

### 11.3 Integration test with real Arduino
A daily smoke test. Plug in Arduino, run `scripts/integration_test.py`, verify:
- Serial connects
- Mock sensor data flows
- Each command type reaches Arduino and produces expected output
- PIR transition triggers wake sequence

### 11.4 Manual conversation testing

For each significant prompt change, run a scripted test conversation:

1. "Good morning"
2. "Who are you?"
3. "Tell me about the garden"
4. (silence for 30 seconds)
5. "I was thinking about... [pause 3 seconds] ...my daughter"
6. (start speaking 1 second into Mira's response — verify interruption)
7. "What time is it?"
8. "Show me a picture of Sarah"
9. "I'm tired"
10. "Goodbye"

Each scripted test should be logged and reviewed.

### 11.5 Latency profiling
Every engine event is timestamped. `scripts/show_metrics.py` aggregates recent conversations and reports:
- p50, p95, p99 latency from speech-end to first-audio-out
- Session duration distribution
- Reconnection frequency
- Cache hit rate

Target: p95 < 2.0 seconds.

### 11.6 Long-running stability test
Run Mira for 12 hours in mock-Arduino mode with a script that simulates occasional conversations. Verify:
- No memory leak
- No event loop stall
- No unhandled exceptions in logs
- Clean shutdown on SIGTERM

---

## 12. Deployment & Operations

### 12.1 Target deployment
A Linux mini-PC (or Mac mini) sitting next to the cardboard robot. USB-tethered to the Arduino. Wired or strong WiFi for Gemini Live.

### 12.2 Startup
- systemd unit at `/etc/systemd/system/mira.service`
- Runs as a dedicated `mira` user (not root)
- Environment file: `/etc/mira/environment` (contains `GEMINI_API_KEY`, `MIRA_SERIAL_PORT`, etc.)
- Auto-restart on failure with 10-second backoff

### 12.3 Logging
- structlog JSON output to `/var/log/mira/mira.log`
- Rotate daily, keep 30 days
- Critical errors also logged to syslog for external monitoring

### 12.4 Observability
- Session transcripts saved to `/var/log/mira/transcripts/YYYY-MM-DD.jsonl`
- Each session records: start, end, summary, every user turn, every Mira response, every command
- Review dashboard: `scripts/review_day.py 2026-01-15`

### 12.5 Secrets
- `GEMINI_API_KEY` — required, from Google AI Studio
- `ELEVENLABS_API_KEY` — only if using manual pipeline (not needed for primary path)
- Secrets never in code. Loaded via `pydantic-settings` from env.

### 12.6 Updates
- Updates delivered via `git pull` + `systemctl restart mira`
- Prompt changes are hot-loaded on restart; no state lost (memory persists)
- Voice changes require restart

### 12.7 Carer access
- Carer adds notes via `scripts/add_note.py "Margaret had a difficult morning"`
- Note injected into next session's context
- Scripts can be aliased to a simple shortcut for non-technical carers

---

## 13. Future Work — Manual Pipeline Swap

If Gemini Live's voice quality proves insufficient after long-term user testing, or if cost/reliability shifts, the manual pipeline swap looks like this:

### 13.1 What needs to be built
- `engines/manual_pipeline.py` — replace the stub
- Dependencies: Silero VAD, faster-whisper, ElevenLabs SDK
- Internal state machine: LISTENING → CAPTURING → TRANSCRIBING → REASONING → SPEAKING → LISTENING
- Interruption handler: Silero speech_start during SPEAKING → cancel EL stream, re-enter CAPTURING

### 13.2 What must NOT change
- `engines/base.py` interface
- Any other module
- System prompts
- Serial protocol
- `main.py` orchestration

If swapping requires changes outside `engines/manual_pipeline.py`, we've failed at modularity. Revisit the interface.

### 13.3 Trigger conditions for the swap
Document what would cause us to actually do this:
- Carer feedback shows Gemini voice feels "cold" or "robotic" consistently
- Gemini Live cost > 2x projected budget
- Gemini Live reliability < 99% over 30-day window
- User population expands beyond what Gemini Live voices serve well

### 13.4 Rollout plan (if triggered)
1. Implement `manual_pipeline.py` behind feature flag
2. Run both engines in parallel for a week (one session each)
3. Carer + user blinded preference test
4. Switch default based on result
5. Keep both engines maintained for 90 days in case of rollback

---

## 14. Appendices

### A. Dependencies (`pyproject.toml` targets)

```toml
[project]
name = "mira"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "google-genai>=1.0.0",
    "pyserial>=3.5",
    "pyserial-asyncio>=0.6",
    "sounddevice>=0.4.6",
    "numpy>=1.26",
    "pydantic>=2.5",
    "pydantic-settings>=2.1",
    "structlog>=24.1",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "pytest-asyncio>=0.23",
    "mypy>=1.8",
    "ruff>=0.2",
]
manual-pipeline = [
    # For the future manual pipeline. Not needed for primary path.
    "faster-whisper>=1.0",
    "silero-vad>=5.0",
    "elevenlabs>=1.0",
]
```

### B. Environment variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Google AI Studio key |
| `MIRA_SERIAL_PORT` | Yes | e.g., `/dev/ttyUSB0`, `COM3` |
| `MIRA_PERSON_PROFILE` | Yes | Path to profile JSON |
| `MIRA_MEMORY_PATH` | Yes | Path to memory JSON |
| `MIRA_LOG_LEVEL` | No | default `INFO` |
| `MIRA_MOCK_ARDUINO` | No | `true` to use mock instead of real serial |
| `ELEVENLABS_API_KEY` | No | Only for manual pipeline |

### C. Person profile format (`profile.json`)

```json
{
  "name": "Margaret",
  "age": 82,
  "condition": "early-stage dementia",
  "key_people": ["Sarah (daughter)", "Tom (son)", "Dr. Patel (GP)"],
  "favourite_topics": ["gardening", "her cat Biscuit", "the 1960s"],
  "photos": {
    "sarah.bmp": "Sarah's birthday, 1987",
    "garden.bmp": "The garden in summer",
    "biscuit.bmp": "Biscuit the cat",
    "wedding.bmp": "Wedding day, 1964"
  },
  "default_face": "calm",
  "default_led": "cool",
  "greeting_on_wake": "Hello, dear. I'm here."
}
```

### D. Troubleshooting quick reference

| Symptom | Likely cause | Fix |
|---|---|---|
| No audio in / out | Wrong device selected | Run `scripts/list_audio_devices.py`, update config |
| Gemini reconnecting loop | API key invalid or quota exceeded | Check env, check Google AI Studio quota |
| Arduino not responding | Wrong serial port | `ls /dev/tty*` before and after plugging Arduino |
| Face doesn't update | Malformed command JSON | Check `mira.log` for command parse warnings |
| Mira cuts user off | Silence timeout too short (manual pipeline only) | Not applicable to Gemini Live |
| Robot feels cold | Voice selection | Try Kore voice; adjust speaking rate |
| Photos don't show | Wrong BMP format | Use `scripts/prepare_photos.sh` to convert |

### E. Key references

- Gemini Live API: https://ai.google.dev/gemini-api/docs/live
- google-genai SDK: https://googleapis.github.io/python-genai/
- pyserial-asyncio: https://pyserial-asyncio.readthedocs.io/
- sounddevice: https://python-sounddevice.readthedocs.io/
- structlog: https://www.structlog.org/

---

## Closing note

This plan prioritizes two things above all else: a user experience that serves a vulnerable population with warmth and consistency, and an architecture that can evolve without breaking. The Gemini Live decision is a considered tradeoff — voice warmth slightly reduced in exchange for conversational naturalness that is critical for dementia users. If that tradeoff proves wrong, the modular architecture ensures we can correct course with a single-module swap.

Every decision documented here should be revisitable. If implementation reveals a better path, update this document and carry on.
