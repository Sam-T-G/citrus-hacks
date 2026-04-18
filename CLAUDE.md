# Project: Mood Robot

> LLM entry point. Read this first. Follow links for depth.

## What This Is
A physical robot that senses your mood and stress levels via camera (computer vision / facial expression analysis), then responds with comforting words, motivational messages, jokes, or shit-talk depending on your preference. Controls ambient LED lighting around the house and optionally curates playlists to match or shift your mood. Targets anyone who wants an emotionally-reactive environment at home.

## Stack
| Layer | Tech |
|-------|------|
| Firmware | Arduino (C++) |
| Vision/AI | Python (OpenCV + emotion detection model, Claude API for response generation) |
| Backend | Python (FastAPI or similar) |
| Frontend | LED screen on robot body (TBD) |
| Comms | Serial (Arduino ↔ Python) |
| DB | None (stateless, or lightweight SQLite for mood history) |

## Repo Layout
```
prototypes/     # hardware sketches and proof-of-concept code
docs/           # architecture, hardware spec, decision log
STATUS.md       # current sprint — read this for live context
```

## Key Docs (read in order if catching up)
1. [Ideas Overview](docs/ideas/IDEAS_OVERVIEW.md) — all candidate ideas with feasibility comparison
2. [Architecture](docs/ARCHITECTURE.md) — system design for chosen idea (TBD)
3. [Hardware](docs/HARDWARE.md) — Arduino pinouts, sensors, wiring notes
4. [Decisions](docs/DECISIONS.md) — why we chose X over Y
5. [Status](STATUS.md) — what's being worked on right now

## Ideas (under consideration)
| Idea | File |
|------|------|
| Mood Robot | [docs/ideas/mood_robot.md](docs/ideas/mood_robot.md) |
| RFID Shield Network | [docs/ideas/rfid_shield.md](docs/ideas/rfid_shield.md) |
| Braille Printer | [docs/ideas/braille_printer.md](docs/ideas/braille_printer.md) |
| Smart Medication Assistant | [docs/ideas/smart_pillbox.md](docs/ideas/smart_pillbox.md) |
| Sleep AI | [docs/ideas/sleep_ai.md](docs/ideas/sleep_ai.md) |

## Conventions
- **Firmware**: one `.ino` per prototype in `prototypes/<feature>/`
- **Status updates**: edit `STATUS.md` when you start/finish a task or hit a blocker
- **Decisions**: log any non-obvious technical choice in `docs/DECISIONS.md`
- **Interfaces**: if two components talk to each other, document the contract in `docs/ARCHITECTURE.md`
