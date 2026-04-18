# Idea: Smart Medication Assistant

## Concept
An AI-powered pillbox that tracks whether doses are actually taken, escalates reminders intelligently, and uses Claude AI to reason about medication safety — answering questions like "can I take these together?", "I missed a dose, what do I do?", or "is it safe to drink tonight?"

---

## Hardware Constraints
- **Microcontroller**: Arduino Uno or Mega (no ESP32)
- **No WiFi on device** — Claude API calls route through laptop via USB serial
- **Physical build**: cardboard box chassis for the pillbox enclosure
- Laptop must be nearby, but this is natural for a bedside/kitchen counter device

### Impact of No WiFi
Minimal. A pillbox lives on a counter next to a phone or laptop. The architecture works fine with serial tether:
- Arduino handles alarms, LEDs, sensors, display
- Laptop handles Claude API calls and the web UI (if any)
- This is acceptable — the device doesn't need to be portable

---

## Architecture

```
[Arduino Uno/Mega]
   ├── DS3231 RTC → scheduled dose time check
   ├── Buzzer → audible alarm
   ├── 3–7x LEDs → light the correct compartment
   ├── SSD1306 OLED → show reminder + AI response
   ├── Hall sensors / microswitches → detect compartment opened
   └── Push button → "Ask AI" trigger
          │
          │ USB Serial (events + AI requests)
          ▼
      [Laptop — Python]
          ├── Receives dose events (taken / missed / overdue)
          ├── Calls Claude API for medication safety Q&A
          ├── Sends AI response back over serial → OLED display
          └── Optional: FastAPI web UI for schedule management
```

---

## Pin Budget

### Arduino Uno (3-compartment demo)
```
Pin   | Use
------|-------------------------------
A4    | DS3231 SDA (I2C)
A5    | DS3231 SCL (I2C)
       (SSD1306 shares same I2C bus)
D4    | LED — compartment 1
D5    | LED — compartment 2
D6    | LED — compartment 3
D7    | Hall sensor — compartment 1
D8    | Hall sensor — compartment 2
D9    | Hall sensor — compartment 3
D3    | Buzzer (PWM for tone variation)
D2    | Push button "Ask AI"
D0/D1 | Serial RX/TX
```
**Uno fits 3-compartment demo cleanly. 12 pins used.**

### Arduino Mega (7-compartment full build)
```
Needs: 7 LEDs + 7 sensors + RTC I2C + OLED I2C + buzzer + button = 17 I/O
Uno only has 12 usable digital + 6 analog = 18 total — technically fits but very tight
Mega is strongly recommended for 7-compartment version
```

**Recommendation: Demo with 3 compartments on Uno. It demonstrates the full concept without needing Mega.**

---

## Hardware Components — Revised List

| Component | Model | Est. Cost | Notes |
|-----------|-------|-----------|-------|
| Microcontroller | Arduino Uno (3-compartment) or Mega (7) | owned | |
| RTC module | DS3231 I2C | ~$4 | Battery-backed; shares I2C bus with OLED |
| OLED display | SSD1306 128x64 I2C | ~$4 | Shares I2C with RTC (different address) |
| LEDs | 5mm red/green x3–7 | ~$1 | One per compartment |
| Lid sensors | Hall effect A3144 x3 or microswitches | ~$3 | Detect lid open = dose taken |
| Small magnets | 5mm neodymium x3 | ~$2 | Trigger Hall sensor on lid |
| Buzzer | Active piezo | ~$1 | |
| Push button | Tactile switch | <$1 | "Ask AI" trigger |
| Pillbox enclosure | Cardboard box (on hand) | $0 | Cut compartment holes, mount LEDs |
| Resistors (220Ω) | — | <$1 | LED current limiting |

**Total new purchases: ~$10–15**

---

## Software Components

| Component | Library / Tool | Setup Time |
|-----------|---------------|------------|
| DS3231 RTC | `RTClib` Arduino | 20 min |
| OLED | `Adafruit_SSD1306` + `Adafruit_GFX` | 30 min |
| Hall sensor polling | `digitalRead` + debounce | 20 min |
| Serial → Python | `pyserial` | 15 min |
| Claude API | `anthropic` Python SDK | 30 min |
| Medication safety prompt | Custom system prompt (see below) | 45 min |
| Optional: web UI | Simple HTML + fetch() | 1–2 hr |

---

## Claude AI Prompt Design

```
System:
You are a medication safety assistant embedded in a smart pillbox.
The user's current medications: {meds_list}
Today's dose log: {dose_log}
Answer in 2–3 sentences max. Always append:
"Consult your doctor or pharmacist for personalized advice."

User: {natural_language_question}
```

**Example interactions:**
- "Can I take ibuprofen and my blood thinner together?"
  → "Combining ibuprofen with warfarin significantly increases bleeding risk. Consider acetaminophen instead. Consult your doctor or pharmacist for personalized advice."
- "I missed my 9am metformin, what do I do?"
  → "Take the missed dose now if it has been less than 4 hours. If your next dose is within 2 hours, skip it and continue your normal schedule. Never double-dose."
- "Can I drink tonight?"
  → "You took amoxicillin this morning — alcohol won't reduce effectiveness but may worsen nausea. Moderate consumption is generally fine. Consult your doctor or pharmacist for personalized advice."

---

## Realistic Time Budget (24-hour hackathon)

| Phase | Task | Time Est. | Risk |
|-------|------|-----------|------|
| 0 | Wire Uno + DS3231 + OLED + 3 LEDs + 3 Hall sensors + buzzer | 1.5 hr | Low |
| 1 | Arduino firmware: RTC time check → scheduled alarm → LED + buzzer + OLED | 2 hr | Low |
| 2 | Arduino firmware: Hall sensor polling → dose confirmed event via serial | 1 hr | Low |
| 3 | Arduino firmware: escalating reminder (buzz every 5 min if not taken) | 30 min | Low |
| 4 | Arduino firmware: receive AI response string → display on OLED | 30 min | Low |
| 5 | Python: serial listener → dose event log | 30 min | Low |
| 6 | Python: Claude API medication Q&A | 1 hr | Low |
| 7 | Python: send Claude response back to Arduino over serial | 30 min | Low |
| 8 | Cardboard pillbox: cut 3 compartment holes, mount LEDs, fit sensors | 1.5 hr | Low |
| 9 | End-to-end test + demo polish | 1.5 hr | Low |
| **Total** | | **~11–12 hr** | Easiest full demo of all ideas |

---

## Risk Matrix

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| DS3231 I2C address conflict with OLED | Low | Low | DS3231 = 0x68, SSD1306 = 0x3C — no conflict |
| Hall sensor false triggers from movement | Medium | Low | 50ms debounce; magnet must be within 5mm |
| Claude gives dangerous medical advice | Low | Medium | System prompt disclaimer; "consult your doctor" hard-coded suffix |
| OLED too small for full AI response | Medium | Low | Scroll text or truncate to 3 lines; show full response on laptop |
| Serial message collision (Arduino → Python + Python → Arduino) | Low | Medium | Use separate serial channels or clear request/response framing |

---

## Core vs Cut

| Feature | Keep? |
|---------|-------|
| RTC alarm → LED + buzzer → OLED reminder | Yes — core |
| Hall sensor dose confirmation | Yes — core |
| Escalating missed-dose alert | Yes — 30 min |
| Claude medication Q&A via button | Yes — the differentiator |
| Claude response on OLED | Yes |
| Web UI for schedule management | Optional — laptop terminal is fine for demo |
| 7-compartment full build | Cut — 3 compartments proves the concept |
| Compartment locking servo | Cut — LEDs are sufficient |
| Voice input | Cut — button is enough |

---

## Demo Day Script
1. Show the pillbox: 3 cardboard compartments, LEDs, OLED
2. OLED shows current time and upcoming dose schedule
3. Alarm fires: Compartment 2 LED lights up, buzzer sounds, OLED: "Time for Ibuprofen"
4. Open compartment 2 lid → Hall sensor triggers → OLED: "Dose confirmed ✓ 2:15pm"
5. Simulate missed dose: wait 2 min, buzzer escalates, OLED: "⚠️ Dose overdue — Compartment 1"
6. Press "Ask AI" button, type: "Can I have coffee with my blood pressure meds?"
7. Claude response appears on OLED and laptop screen
8. Show dose log on laptop: timestamped history of taken/missed doses

---

## Open Questions
- Uno (3 compartments) vs Mega (7 compartments)?
- Hall effect sensors vs microswitches for lid detection? (Hall = cleaner; switch = simpler)
- Hardcode 3 medications in firmware for demo vs editable via serial command?
- Add TTS (text-to-speech) on laptop to read Claude's response aloud?
