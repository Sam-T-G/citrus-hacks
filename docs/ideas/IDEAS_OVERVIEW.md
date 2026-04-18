# Citrus Hacks — Ideas Overview

> All ideas assume: Arduino Uno/Mega only (no ESP32), cardboard box chassis, laptop as API host.

---

## Hardware Constraints Summary

| Constraint | Implication |
|-----------|-------------|
| No ESP32 / no onboard WiFi | All cloud API calls (Claude, Gemini) route through laptop via USB serial |
| Arduino Uno/Mega only | Uno = 12 usable digital pins; Mega = 54. Pin budgets matter. |
| Cardboard box build | Lightweight chassis only; no precision mechanical mounts |
| Laptop tethered for all ideas | Acceptable — none of these are truly portable at demo scale |

---

## Revised Comparison Table

| Idea | Est. Build Time | Demo Risk | Wow Factor | Arduino Needed | New Parts Cost |
|------|----------------|-----------|-----------|----------------|---------------|
| [Mood Robot](mood_robot.md) | 15–18 hr | Medium | High | Uno or Mega | ~$25–35 |
| [RFID Shield](rfid_shield.md) | 8–10 hr | Medium | **Low*** | Uno | ~$5 |
| [Braille Printer](braille_printer.md) | 13–14 hr | Medium–High | Very High | **Mega required** | ~$20–25 |
| [Smart Pillbox](smart_pillbox.md) | 11–12 hr | Low | Medium | Uno (3 compartments) | ~$10–15 |
| [Sleep AI](sleep_ai.md) | 14–17 hr | Medium | Medium | Uno or Mega | ~$15–20 |

*RFID Shield loses its "pocket standalone" value proposition without ESP32. Wow factor drops significantly.

---

## How Hardware Constraints Changed Each Idea

### Mood Robot — Unchanged
Already planned as laptop-tethered. Python + Claude on laptop, Arduino as output controller. No fundamental change. Still the most visually dynamic demo.

### RFID Shield — Significantly Weakened
**Core pitch was "pocket-sized standalone guardian."** Without ESP32 WiFi, the device is permanently tethered to a laptop. Cannot send push alerts independently. Cannot be carried in a pocket. The product narrative collapses. The build becomes easy (~8 hr) but the demo is underwhelming: "it blinks red when another RFID reader comes near, and the laptop shows a Gemini report."

**Recommendation: Deprioritize unless you can source an ESP32.**

### Braille Printer — Unchanged (requires Mega)
Was always laptop-tethered for Gemini + Whisper. Arduino Mega is required (6 PWM pins for 6 servos). If Mega is available, this idea is unaffected. Enlarged-scale single-cell demo is still the right scope.

### Smart Pillbox — Minimally Changed
Lost WiFi, but a pillbox lives on a counter next to a laptop anyway. Core functionality (RTC, LEDs, sensors, OLED, Claude Q&A via serial) works identically. Uno fits the 3-compartment demo cleanly. **Best risk/reward ratio with these constraints.**

### Sleep AI — Minimally Changed
Lost WiFi, but the laptop hosts the dashboard anyway. Requires the laptop to stay on overnight (demo concern, not a blocker). Core alarm + sunrise + movement detection works on Uno. I2C address conflict between MPU-6050 and DS3231 must be resolved (tie MPU-6050 AD0 HIGH).

---

## Pin Budget Quick Reference

### Mood Robot (Uno)
```
D6  → WS2812B data
D9  → Servo 1
D10 → Servo 2
A4  → OLED SDA (I2C)
A5  → OLED SCL (I2C)
```
✅ Fits Uno

### RFID Shield (Uno)
```
D10–D13 → RC522 SPI
D9      → RC522 RST
D2      → Status LED
D3      → Buzzer
```
✅ Fits Uno

### Braille Printer (Mega required)
```
D2–D7 → 6x SG90 servos
```
❌ Uno: 6 servos use all PWM pins + no room left
✅ Mega: plenty of PWM pins

### Smart Pillbox (Uno — 3 compartments)
```
A4/A5 → I2C bus (DS3231 + OLED)
D4–D6 → 3x LEDs
D7–D9 → 3x Hall sensors
D3    → Buzzer
D2    → Push button
```
✅ Fits Uno cleanly

### Sleep AI (Uno)
```
A4/A5 → I2C bus (MPU-6050 at 0x69, DS3231 at 0x68, OLED at 0x3C)
D6    → WS2812B data
D3    → Buzzer
D5    → Vibration motor (via transistor)
D2    → Button
```
✅ Fits Uno — but must tie MPU-6050 AD0 HIGH to resolve I2C conflict

---

## Final Recommendation (With Hardware Constraints)

**Best overall: Smart Pillbox**
- Cheapest ($10–15 in parts)
- Easiest build (11–12 hr)
- Lowest demo risk
- Claude AI angle is the strongest differentiator
- Works perfectly with Uno + laptop

**Best wow factor: Braille Printer** (if Mega is available)
- Most memorable demo, strongest social impact narrative
- Achievable in 13–14 hr if scoped to single cell
- Clay + servo embossing is visually compelling and tactile

**Best demo narrative: Mood Robot**
- Physical robot reacting to your face is immediately engaging
- Multiple visual outputs (LEDs + screen + movement) make a rich demo
- 15–18 hr is achievable with two people

**Deprioritize: RFID Shield**
- Without ESP32, core value prop (pocket guardian) is gone
- Build is fast but demo is weak: blinking LED + Gemini text report
- Would recommend sourcing an ESP32 or pivoting away from this idea

---

## Component Shopping List (Buy Everything, Pick One Idea)

If you want to buy parts before deciding, these cover all ideas:

| Component | Qty | Covers |
|-----------|-----|--------|
| DS3231 RTC module | 1 | Pillbox, Sleep AI |
| SSD1306 OLED 128x64 I2C | 1 | All ideas |
| WS2812B LED strip 1m | 1 | Mood Robot, Sleep AI |
| SG90 micro servos | 6 | Mood Robot (2), Braille (6) |
| MPU-6050 IMU | 1 | Sleep AI |
| RC522 RFID module | 1 | RFID Shield |
| Active piezo buzzer | 2 | Pillbox, Sleep AI |
| Hall effect sensors A3144 | 3 | Pillbox |
| 5mm LEDs (assorted) | 10 | Pillbox |
| Push buttons | 4 | All ideas |
| NPN transistors 2N2222 | 2 | Sleep AI (vibe motor) |
| Assorted resistors | 1 pack | All ideas |
| Play-Doh (fresh) | 2 cans | Braille |
| Jumper wires + breadboard | — | All ideas |
