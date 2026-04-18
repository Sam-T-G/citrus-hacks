# Idea: Mood Robot

## Concept
A physical robot that reads facial expressions via camera, infers emotional state, generates a contextual response via Claude API (motivational, comforting, jokes, or shittalk), and reacts with ambient LED lighting, an on-body screen, and servo head movement.

---

## Hardware Constraints
- **Microcontroller**: Arduino Uno or Mega (no ESP32 available)
- **Physical build**: cardboard box chassis
- **No WiFi on device** — all Python/Claude runs on laptop; Arduino is purely an output controller receiving serial commands

---

## Architecture With Arduino Uno/Mega

```
[Laptop]
   ├── Camera (USB webcam)
   ├── Python: emotion detection (OpenCV + fer)
   ├── Python: Claude API → response text
   └── Python: serial commands → Arduino
            │  USB Serial (115200 baud)
            ▼
      [Arduino Uno/Mega]
            ├── WS2812B LED strip  (D6)
            ├── Servo 1 — head tilt  (D9)
            ├── Servo 2 — head pan   (D10)
            └── SSD1306 OLED         (SDA=A4, SCL=A5)
```

This was already the planned architecture — **no fundamental change from removing ESP32**.

---

## Pin Budget

### Arduino Uno (tight but workable)
```
Pin   | Use
------|----------------------
D6    | WS2812B data (NeoPixel)
D9    | Servo 1 (PWM)
D10   | Servo 2 (PWM)
A4    | OLED SDA (I2C)
A5    | OLED SCL (I2C)
D0/D1 | Serial RX/TX (reserved for laptop comms)
```
**Result**: All components fit on Uno. 7 pins used, no conflicts.

### Arduino Mega (recommended if available)
More PWM pins, more breathing room. Use if adding more servos or LEDs.

---

## Hardware Components — Revised List

| Component | Model | Est. Cost | Notes |
|-----------|-------|-----------|-------|
| Camera | USB webcam (any) | ~$0–25 | Plugs into laptop, not Arduino |
| Microcontroller | Arduino Uno or Mega | already owned | |
| Servos | SG90 micro x2 | ~$5 each | External 5V supply — do NOT use Arduino 5V |
| LED strip | WS2812B 1m | ~$8 | Single data pin; 300Ω series resistor on data line |
| OLED display | SSD1306 128x64 I2C | ~$4 | I2C = only 2 pins (SDA/SCL) |
| External servo power | USB 5V phone charger or 4xAA pack | ~$0–3 | Servos draw too much current from Uno's 5V pin |
| Cardboard box | On hand | $0 | Robot body; hot glue + tape |
| 300Ω resistor | — | <$1 | WS2812B data line protection |
| 1000µF capacitor | — | <$1 | Across LED strip power rails |
| Jumper wires | — | — | — |

**Total new purchases est.: ~$25–35**

---

## Software Components

| Component | Library / Tool | Setup Time |
|-----------|---------------|------------|
| Camera capture | `cv2.VideoCapture` (OpenCV) on laptop | 15 min |
| Emotion detection | `fer` Python lib (lightweight, fast) | 30–60 min |
| Claude API | `anthropic` Python SDK on laptop | 30 min |
| Serial comms | `pyserial` on laptop | 15 min |
| Arduino: serial parser | `ArduinoJson` lib | 1–2 hr |
| Arduino: NeoPixel | `Adafruit_NeoPixel` | 30 min |
| Arduino: OLED | `Adafruit_SSD1306` + `Adafruit_GFX` | 30 min |
| Arduino: Servos | `Servo.h` (built-in) | 15 min |

---

## Serial Command Protocol (Laptop → Arduino)

```json
{"cmd": "led",    "r": 255, "g": 100, "b": 0,   "brightness": 180}
{"cmd": "servo",  "id": 1,  "angle": 90}
{"cmd": "screen", "text": "You got this!", "icon": "smile"}
{"cmd": "anim",   "type": "breathe", "speed": 2}
```
All commands are newline-terminated JSON. Arduino parses with `ArduinoJson`, dispatches to correct driver.

---

## Realistic Time Budget (24-hour hackathon)

| Phase | Task | Time Est. | Risk |
|-------|------|-----------|------|
| 0 | Wire servos + LED strip + OLED to Uno; test each individually | 1.5 hr | Low |
| 1 | Arduino firmware: serial JSON parser + dispatch to LED/servo/OLED drivers | 3–4 hr | Medium — get this working first, everything depends on it |
| 2 | Python: camera capture + `fer` emotion detection | 2 hr | Medium — test under actual demo lighting early |
| 3 | Python: Claude API call with emotion + mode → response text | 1 hr | Low |
| 4 | Python: `pyserial` → send LED + screen + servo commands | 1 hr | Low |
| 5 | Emotion → output mapping (color, servo angle, animation per emotion) | 1 hr | Low |
| 6 | Cardboard robot body: cut, fold, hot glue servo mount + LED strip | 2 hr | Low — keep it simple |
| 7 | Mode selector: keyboard key or physical button (D2) | 30 min | Low |
| 8 | End-to-end integration test + debug | 2 hr | Medium |
| 9 | Demo polish: startup sequence, smooth transitions | 1 hr | Low |
| **Total** | | **~15–18 hr** | Comfortable in 24 hr |

---

## Risk Matrix

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `fer` emotion model inaccurate under office lighting | High | High | Test immediately; add "override emotion" keyboard shortcut for demo |
| Servo jitter / brownout on Uno 5V pin | High | High | **External power for servos from day 1** — this is non-negotiable |
| Serial JSON parsing fails / buffer overflow | Medium | Medium | Keep JSON messages short; flush buffer after each `\n` |
| `fer` model download is slow at venue | Low | Low | Pre-download before hackathon |
| Cardboard chassis collapses under servo torque | Low | Low | Hot glue servo mounts generously; brace with internal cardboard ribs |

---

## Cardboard Build Tips
- Hot glue SG90 servo into a cardboard tube for the neck
- Cut a face panel from box face for OLED window
- LED strip runs along inside edge of box lid for ambient room glow effect
- Laptop stays hidden behind/beside the robot; only Arduino + hardware visible on table

---

## Core vs Cut

| Feature | Keep? |
|---------|-------|
| Emotion detection → Claude response | Yes — core |
| LED strip color per emotion | Yes — core |
| OLED response text | Yes — core |
| Servo head movement | Yes — 30 min to add once firmware done |
| Mode selector (motivational/jokes/etc.) | Yes — keyboard key is 5 min |
| Spotify | No — cut entirely |

---

## Demo Day Script
1. Robot idle: LED strip white, OLED shows smiley face
2. Sit in front of camera → "stressed" detected
3. LED strip shifts to slow orange breathing animation
4. OLED: "Tough day? You're still here. That counts."
5. Servo head tilts toward you
6. Press key → cycle to "jokes" mode → same face → joke appears on OLED
7. LED strip pulses faster for jokes mode

---

## Open Questions
- Uno or Mega? (Uno fits; Mega gives room to expand)
- `fer` vs `deepface` for emotion detection? (`fer` is lighter and faster — recommended)
- Run Python as one script or split into vision + API + serial modules?
- Physical button on robot (D2) for mode switch vs keyboard shortcut?
