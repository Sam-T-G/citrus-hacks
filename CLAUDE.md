# Project: BlindAide

> LLM entry point. Read this first. Follow links for depth.

## What This Is
A portable assistive device for blind users that (1) reads human nonverbal social cues via camera + MediaPipe computer vision and (2) renders text tactilely through a refreshable single-cell Braille pin display driven by 6 SG90 servo motors. Built with an Arduino Uno R3, cardboard enclosure, and breadboard components. Python runs on a companion laptop connected via USB serial.

## Stack
| Layer | Tech |
|-------|------|
| Firmware | Arduino C++ (`Servo.h`) |
| Vision | Python — OpenCV + MediaPipe FaceMesh + Hands |
| Serial bridge | Python — `pyserial` |
| Braille encoding | Python — custom Grade 1 lookup table |
| TTS fallback | Python — `pyttsx3` |
| Voice input | Python — `SpeechRecognition` |

## Repo Layout
```
blindaide/          # Python host software (runs on laptop)
  main.py           # entry point — mode switching, event loop
  vision.py         # camera capture + MediaPipe cue analysis
  context_engine.py # cue classification + debounce
  braille.py        # text ↔ 6-bit braille cell encoding
  serial_bridge.py  # serial connection to Arduino
  chord_input.py    # maps chord bytes → characters
  audio.py          # TTS + voice input
  config.py         # thresholds, serial port, constants
prototypes/
  blindaide/
    blindaide.ino   # Arduino Uno R3 firmware
docs/               # architecture, hardware spec, decision log
STATUS.md           # current sprint — read this for live context
```

## Key Docs (read in order if catching up)
1. [Architecture](docs/ARCHITECTURE.md) — system design, data flow, component boundaries
2. [Hardware](docs/HARDWARE.md) — Arduino pinouts, wiring, physical build
3. [Decisions](docs/DECISIONS.md) — why we chose X over Y
4. [Status](STATUS.md) — what's being worked on right now

## Conventions
- **Firmware**: `prototypes/blindaide/blindaide.ino` is the single production sketch
- **Python**: all source lives in `blindaide/`; import from sibling modules directly
- **Status updates**: edit `STATUS.md` when you start/finish a task or hit a blocker
- **Decisions**: log any non-obvious technical choice in `docs/DECISIONS.md`
- **Calibration**: vision thresholds live in `blindaide/config.py` — tune per session
