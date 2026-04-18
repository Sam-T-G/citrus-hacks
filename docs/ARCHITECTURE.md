# Architecture

## System Overview
BlindAide runs two parallel input pipelines on a laptop and dispatches output to an Arduino Uno R3 over USB serial. The Arduino drives 6 SG90 servos that physically raise and lower pins to form Braille characters. The laptop also provides TTS audio as a secondary output channel.

## Component Map

```
┌─────────────────────────────────────────────────────────────┐
│                        INPUT LAYER                          │
│   ┌──────────────┐               ┌──────────────────────┐  │
│   │  USB Camera  │               │    Text Input        │  │
│   │  720p+       │               │  keyboard / voice /  │  │
│   └──────┬───────┘               │  chord keyboard      │  │
└──────────┼───────────────────────└──────────┬────────────┘  │
           │                                  │
┌──────────┼──────────────────────────────────┼──────────────┐
│          ▼         PROCESSING LAYER         ▼              │
│  ┌──────────────┐  ┌───────────────┐  ┌────────────────┐  │
│  │  vision.py   │→ │context_engine │← │  braille.py    │  │
│  │  MediaPipe + │  │classify cues  │  │  Grade 1 encode│  │
│  │  OpenCV      │  │debounce queue │  │                │  │
│  └──────────────┘  └──────┬────────┘  └────────────────┘  │
└─────────────────────────  │  ──────────────────────────────┘
                             │  USB Serial @ 9600 baud (pyserial)
                             │  single byte per braille cell
┌────────────────────────────┼──────────────────────────────┐
│                            ▼       OUTPUT LAYER           │
│             ┌──────────────────────────┐                  │
│             │     Arduino Uno R3       │                  │
│             │  blindaide.ino           │                  │
│             │  decodes 6-bit cell byte │                  │
│             │  6× Servo PWM output     │                  │
│             └──────────┬───────────────┘                  │
│                        │                                  │
│             ┌──────────▼───────────────┐                  │
│             │   SG90 Servo Array ×6    │                  │
│             │   0°  = pin retracted    │                  │
│             │   90° = pin raised       │                  │
│             └──────────┬───────────────┘                  │
│                        │                                  │
│             ┌──────────▼───────────────┐                  │
│             │   Braille Cell (2×3)     │                  │
│             │   6 pins (toothpick /    │                  │
│             │   3mm dowel)             │                  │
│             └──────────────────────────┘                  │
│                                                           │
│             ┌──────────────────────────┐                  │
│             │   pyttsx3 TTS (laptop)   │  ← parallel out  │
│             └──────────────────────────┘                  │
└───────────────────────────────────────────────────────────┘
```

## Data Flow — CV Mode
1. Camera captures frame → `vision.analyze_frame()` runs MediaPipe FaceMesh + Hands
2. Returns dict of cue values: gaze offset, smile score, brow raise, nod pitch, hand raised, face size
3. `context_engine.process()` classifies dominant cue, applies debounce (1.5s min between repeats)
4. Returns short label string: `"SMILE"`, `"HAND"`, `"NOD"`, `"ATTN"`, etc.
5. `serial_bridge.send_text()` encodes label → Grade 1 Braille cell bytes → sends one byte at a time
6. Arduino receives byte → sets 6 servos to match the 6-bit bitmask
7. TTS speaks the label in parallel

## Data Flow — Text Mode
1. User types text in terminal (or voice input is transcribed)
2. `braille.text_to_cells()` converts string → list of 6-bit cell bytes
3. `serial_bridge.send_text()` sends bytes with configurable cell duration (default 0.6s per cell)
4. Arduino drives servos; TTS reads text aloud in parallel

## Data Flow — Chord Keyboard (Arduino → PC)
1. User presses subset of 6 buttons simultaneously
2. Arduino reads button state, sends 6-bit bitmask byte when all keys release
3. Python `chord_input.ChordDecoder.decode()` maps byte → character
4. Characters accumulate into a word buffer until space chord is pressed
5. Word sent to TTS; can also be looped back to the Braille display

## Serial Protocol

**PC → Arduino (display command):**
```
Single byte. Bits 0–5 = dot positions 1–6.
bit 0 = dot 1 (top-left)
bit 1 = dot 2 (mid-left)
bit 2 = dot 3 (bottom-left)
bit 3 = dot 4 (top-right)
bit 4 = dot 5 (mid-right)
bit 5 = dot 6 (bottom-right)

0x00 = blank cell (all pins down)
0x01 = dot 1 only (letter A)
0x13 = dots 1,2,5 (letter H)
```

**Arduino → PC (chord input):**
```
Same 6-bit bitmask format. Sent once when all keys are released after a chord.
```

## Operating Modes
| Mode | Trigger | Input | Output |
|------|---------|-------|--------|
| CV | default | camera frames | cue label → Braille + TTS |
| Text | ENTER to cycle | terminal keyboard | typed string → Braille + TTS |
| Voice | ENTER to cycle | microphone | transcribed speech → Braille + TTS |

## File Structure
```
blindaide/
  main.py            entry point, mode switching, threads
  vision.py          MediaPipe analysis → cue dict
  context_engine.py  cue classification + debounce
  braille.py         Grade 1 encoding/decoding
  serial_bridge.py   pyserial wrapper
  chord_input.py     chord byte → character decoder
  audio.py           TTS + voice input
  config.py          all tunable constants
prototypes/
  blindaide/
    blindaide.ino    Arduino firmware
```
