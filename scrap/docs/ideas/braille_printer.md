# Idea: Braille Printer

## Concept
A physical device that takes speech or visual text input, translates it to Braille via Gemini, and physically embosses the dot pattern into clay using servo actuators. A tactile output device for the visually impaired.

---

## Hardware Constraints
- **Microcontroller**: Arduino Uno or Mega (no ESP32)
- **No WiFi on device** — Gemini API calls go through laptop via USB serial
- **Physical build**: cardboard box chassis
- Laptop must be nearby — natural for a stationary translation device

### Impact of No WiFi
None. This was always a laptop-tethered device. The Gemini pipeline runs on laptop, sends dot patterns to Arduino over serial. No change needed.

---

## Architecture

```
[Laptop]
   ├── Microphone → Whisper (speech-to-text)
   ├── Camera → Tesseract OCR (image-to-text)
   ├── Python: Gemini API → Braille dot arrays per character
   └── pyserial → send one cell at a time to Arduino
          │
          │ USB Serial: {"dots": [1,2,5]}
          ▼
      [Arduino Mega]  ← Mega required (6 PWM pins for servos)
          ├── 6x SG90 servos → Braille dot pins
          └── Optional: stepper for carriage advance
```

---

## Why Arduino Mega (Not Uno) — Required

6 servos need 6 PWM pins simultaneously. `Servo.h` on Arduino **disables analogWrite() on pins 9 and 10 when using the Servo library**, and Uno only has 6 PWM pins total (3, 5, 6, 9, 10, 11).

With 6 servos occupying D3, D5, D6, D9, D10, D11 — there are zero PWM pins left for anything else on Uno. Plus D0/D1 are serial, leaving very little flexibility.

**Arduino Mega has 15 PWM pins. Use Mega.**

---

## Pin Budget (Arduino Mega)

```
Pin   | Use
------|-------------------------------
D2    | Servo 1 (dot position 1)
D3    | Servo 2 (dot position 2)
D4    | Servo 4 (dot position 4)
D5    | Servo 3 (dot position 3)
D6    | Servo 5 (dot position 5)
D7    | Servo 6 (dot position 6)
D8    | Carriage stepper step (optional)
D9    | Carriage stepper dir  (optional)
D0/D1 | Serial RX/TX
```
No conflicts. Plenty of room.

---

## Hardware Components — Revised List

| Component | Model | Est. Cost | Notes |
|-----------|-------|-----------|-------|
| Microcontroller | Arduino Mega 2560 | owned | Required for 6 PWM servo pins |
| Servos | SG90 micro x6 | ~$3 each = $18 | One per Braille dot position |
| External power supply | 5V 2A (phone charger or wall adapter) | ~$0 | 6 servos at stall = 6x ~200mA = 1.2A — must not come from Mega 5V pin |
| Blunt pin tips | Cut nails / 3mm dowel rods | ~$2 | Attach to servo horn; must be blunt to emboss not pierce |
| Cardboard chassis | On hand | $0 | Rigid box to mount servos in correct Braille grid layout |
| Hot glue + tape | On hand | $0 | Servo mounting |
| Clay / Play-Doh | Fresh can(s) | ~$3 | Buy fresh; old/dry clay won't emboss |

**Total new purchases: ~$20–25 (mainly servos)**

---

## The Servo Spacing Problem

Standard Braille dot spacing: **2.5mm** between dots. SG90 servo body is **22mm wide.**

You **cannot** fit 6 SG90 servos at standard Braille spacing. The physical dots would be at 22mm+ spacing, not 2.5mm.

### Solutions

**Option A — Enlarged Scale (Recommended for hackathon)**
Use 10mm dot spacing (4x standard). Dots are still readable by touch, just oversized. Servo bodies fit side-by-side with spacers. Acknowledge the scale issue in your pitch: "prototype scale — production version would use solenoids."

**Option B — Mechanical Linkage (Not recommended)**
Mount servos offset from the cell and use rigid rods to transfer force to 2.5mm-spaced pins. Complex, fragile, takes hours to fabricate.

**Option C — Solenoids**
8mm diameter solenoids fit at 10mm spacing. Better than servos, but hard to source same-day.

**Recommendation: Option A. Enlarged single cell, SG90 servos, cardboard frame.**

---

## Servo-to-Pin Mechanical Design

```
SG90 horn (rotating)
   │
   │  attach rigid 3cm arm (stiff wire / popsicle stick)
   ▼
Push pin tip (vertical travel ~5mm)
   │
   ▼
Clay surface
```

- Servo at 0° → pin retracted (above clay)
- Servo at 60° → pin extended (pushed into clay ~3mm)
- Mount all 6 servos vertically above the clay tray
- Each servo drives one pin independently

---

## Realistic Time Budget (24-hour hackathon)

| Phase | Task | Time Est. | Risk |
|-------|------|-----------|------|
| 0 | Plan and cut cardboard chassis: 6 servo mounting holes at correct spacing | 1.5 hr | Medium — measure twice |
| 1 | Mount 6 servos in cardboard frame; verify alignment | 1.5 hr | Medium |
| 2 | Attach pin tips to servo horns; test single servo push motion | 1 hr | Medium — linkage must be rigid |
| 3 | Mega firmware: receive `{"dots": [1,3,5]}` → move correct 3 servos to extended position | 2 hr | Low |
| 4 | Clay tray fabrication: flat cardboard tray that slides under the servo array | 1 hr | Low |
| 5 | Laptop Python: Whisper speech → text | 30 min | Low |
| 6 | Laptop Python: Gemini API → Braille dot arrays | 30 min | Low |
| 7 | Laptop Python: pyserial → send one cell at a time | 30 min | Low |
| 8 | Clay calibration: servo angle vs clay depth | 1.5 hr | **High** — highly dependent on clay stiffness |
| 9 | End-to-end test: speak letter → see servos fire → press clay → read dots | 1.5 hr | Medium |
| 10 | Demo polish | 1 hr | Low |
| **Total** | | **~13–14 hr** | Chassis + clay calibration are the high-risk phases |

---

## Risk Matrix

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Servo spacing too large for legible Braille | **Certain** | Low | Acknowledged in pitch; judges can verify dot pattern visually |
| Clay too hard — servos can't emboss | Medium | High | Buy fresh Play-Doh; test servo force first; warm clay slightly |
| Clay too soft — dots don't hold shape | Medium | Medium | Let clay sit out for 20 min before demo; test multiple brands |
| Servo arm linkage breaks mid-demo | Medium | Medium | Bring spare servos and extra hot glue; test all 6 before demo |
| Cardboard chassis flexes under servo torque | Medium | Medium | Double-layer cardboard + internal bracing |
| Whisper speech recognition fails in noisy hall | Medium | Low | Have a fallback: type text directly instead of speaking |
| Gemini returns incorrect Braille patterns | Low | Medium | Pre-validate dot patterns for demo words ("HELLO", "HI") |

---

## Software — Braille Translation via Gemini

Gemini handles the translation, but also maintain a local lookup table as a fallback:

```python
BRAILLE_MAP = {
    'a': [1], 'b': [1,2], 'c': [1,4], 'd': [1,4,5], 'e': [1,5],
    'f': [1,2,4], 'g': [1,2,4,5], 'h': [1,2,5], 'i': [2,4],
    'j': [2,4,5], 'k': [1,3], 'l': [1,2,3], 'm': [1,3,4],
    'n': [1,3,4,5], 'o': [1,3,5], 'p': [1,2,3,4], 'q': [1,2,3,4,5],
    'r': [1,2,3,5], 's': [2,3,4], 't': [2,3,4,5], 'u': [1,3,6],
    'v': [1,2,3,6], 'w': [2,4,5,6], 'x': [1,3,4,6], 'y': [1,3,4,5,6],
    'z': [1,3,5,6], ' ': []
}
```

Use Gemini for sentences/context; use local map for per-character validation and fallback.

---

## Core vs Cut

| Feature | Keep? |
|---------|-------|
| Speech → Whisper → Gemini → Braille dots → servo cell | Yes — full pipeline |
| Single-cell embossing (one character at a time) | Yes — core demo |
| Camera → OCR input mode | Optional — easy parallel add |
| Multi-cell output with carriage | **Cut** — biggest risk, manual tray slide is fine |
| Standard 2.5mm dot spacing | **Cut** — use enlarged scale |

---

## Demo Day Script
1. Show the device: 6 servos mounted in cardboard frame above a clay tray
2. Show all 6 pins retracted (resting state)
3. Speak into microphone: "H"
4. Laptop shows: Whisper → "H" → Gemini → dots [1,2,5]
5. Servos 1, 2, 5 extend downward (visible movement)
6. Press fresh clay tray up against the pins
7. Pull tray away — show 3 raised dots in the H pattern
8. Hold up Braille reference card — judge verifies dot positions match "H"
9. Repeat for "I" to spell "HI" (two clay impressions side by side)
10. Optional: hold a word up to the camera → OCR → Braille → emboss

---

## Open Questions
- Mega confirmed available? (Required — don't attempt on Uno with 6 servos)
- Servo arm material: stiff wire? popsicle stick? 3D-printed horn extension?
- Clay type: Play-Doh (consistent) vs air-dry clay (holds shape better but hardens)?
- Carriage: cut entirely (manual slide) or simple gear/servo advance?a
- Should Gemini verify the dot patterns, or just use the local lookup table for reliability?
