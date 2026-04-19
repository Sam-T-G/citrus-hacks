# Status

> Update this when you start work, finish something, or hit a blocker.
> LLMs: this file reflects current project state — prefer it over ARCHITECTURE.md for "what's happening now."

## Current Focus
- [ ] Source components: 6× SG90 servos, webcam, 6× tactile buttons
- [ ] Build cardboard enclosure + servo array (physical)
- [ ] Wire servos to Uno R3 with external 5V supply
- [ ] Flash `prototypes/blindaide/blindaide.ino` and test servo response to serial bytes
- [ ] Install Python deps: `pip install opencv-python mediapipe pyserial pyttsx3 SpeechRecognition`
- [ ] Run `blindaide/main.py` and verify CV mode detects cues
- [ ] Calibrate vision thresholds in `blindaide/config.py` under demo lighting

## In Progress
| Who | Task | Notes |
|-----|------|-------|
| | | |

## Done
- [x] Project decided: BlindAide — CV nonverbal cue reader + tactile Braille display
- [x] Full Python source scaffolded: `blindaide/` (8 modules)
- [x] Arduino firmware written: `prototypes/blindaide/blindaide.ino`
- [x] All docs written: ARCHITECTURE, HARDWARE, DECISIONS

## Blockers
<!-- Anything blocking progress — hardware not sourced, unclear requirements, waiting on someone -->

## Open Questions
- Source for SG90 servos: local hobby shop vs order online?
- Cam disc material: cardboard circle glued to servo horn, or bend a wire cam?
- Calibration: run a dedicated calibration script at session start, or tune manually in config.py?
- Stretch: add a buzzer on D2 for audio feedback when a new cue is detected?
