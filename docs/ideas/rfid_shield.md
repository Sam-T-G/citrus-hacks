# Idea: RFID Shield Network

## Concept
A module that detects unauthorized RFID/NFC interrogation attempts near your wallet, alerts the user, and sends incident reports to Gemini for threat classification and network-wide flagging.

---

## Hardware Constraints — Critical Impact

**No ESP32 available. Only Arduino Uno/Mega.**

This fundamentally changes the product:
- Arduino Uno/Mega has **no WiFi** — cannot POST incidents to a backend independently
- The device **must be tethered to a laptop** via USB serial to reach the cloud
- This **kills the "pocket-sized standalone" core value proposition**

### What's Left Without WiFi
The device can still:
- Detect RF field events and light an LED / sound buzzer locally
- Send event data to a laptop via serial
- The laptop forwards to backend → Gemini

But it cannot:
- Operate independently in someone's pocket
- Send push notifications without the laptop nearby
- Form a distributed network of field units

**The pitch becomes "desktop RFID monitor" rather than "pocket guardian"** — significantly less compelling.

---

## Revised Architecture (Laptop-Tethered)

```
[RC522 RFID Module]  attached to Arduino Uno
   │  RF field interrupt → Arduino detects suspicious scan
   ▼
[Arduino Uno]
   │  Serial: {timestamp, duration_ms, event: "rf_field_detected"}
   ▼
[Laptop — Python]
   │  Receives serial events
   ├── Calls Gemini API → threat classification
   ├── Logs to SQLite
   └── Shows alert on screen / plays sound
```

---

## Pin Budget (Arduino Uno)

```
Pin   | Use
------|----------------------
D10   | RC522 SDA (SPI CS)
D11   | RC522 MOSI (SPI)
D12   | RC522 MISO (SPI)
D13   | RC522 SCK (SPI)
D9    | RC522 RST
D2    | Status LED (red = threat)
D3    | Buzzer
D0/D1 | Serial RX/TX (laptop comms)
```
All fits on Uno.

---

## Hardware Components — Revised List

| Component | Model | Est. Cost | Notes |
|-----------|-------|-----------|-------|
| Microcontroller | Arduino Uno | already owned | |
| RFID module | MFRC522 (RC522) | ~$3 | SPI; 3.3V logic — use Uno's 3.3V pin |
| Status LED | RGB or single red LED | ~$1 | Alert indicator |
| Buzzer | Active piezo | ~$1 | Audible alert |
| Cardboard enclosure | On hand | $0 | Flat pack; box the module |

**Total new purchases: ~$5**

---

## The False-Positive Problem (Unchanged)

Distinguishing a malicious skimmer from a legitimate tap-to-pay terminal is still the hardest technical problem. Without mobility (can't walk away from a terminal), this is harder to demonstrate compellingly in a demo.

See previous analysis: use dwell time > 300ms as the skimmer signal heuristic.

---

## Realistic Time Budget (24-hour hackathon)

| Phase | Task | Time Est. | Risk |
|-------|------|-----------|------|
| 0 | Wire RC522 to Uno over SPI; verify with MFRC522 lib example | 1 hr | Low |
| 1 | RF field detection via IRQ or polling mode | 2–3 hr | High — IRQ mode is under-documented |
| 2 | Serial event output to laptop | 30 min | Low |
| 3 | Python: receive serial → Gemini API call | 1 hr | Low |
| 4 | False positive tuning (dwell time threshold) | 2–3 hr | High |
| 5 | Alert: terminal bell / notification / dashboard | 1 hr | Low |
| 6 | Demo polish | 30 min | Low |
| **Total** | | **~8–10 hr** | Fast build, but weak demo narrative |

---

## Honest Assessment

| Factor | Score |
|--------|-------|
| Build feasibility | High |
| Demo narrative strength | **Low** (tethered to laptop = no pocket appeal) |
| Differentiation from "just an RFID reader" | Low without standalone operation |
| Hardware risk | Low |
| False-positive problem | Unsolved, time-consuming |

**Verdict: Loses its core appeal without ESP32. The build is easy, but the pitch is weakened significantly. Would recommend deprioritizing this idea given the hardware constraints, or reframing it as a "desktop security sensor" rather than a personal wearable.**

---

## If You Still Want to Build It — Reframe the Pitch

Instead of "pocket guardian", pitch it as:
> "A desk module for journalists, activists, or anyone handling sensitive RFID credentials in public or shared office spaces. Sits on your desk, monitors for unauthorized card scanning attempts, and files live AI threat reports."

This reframe works with a laptop-tethered architecture. Less mass-market but more specific and credible.

---

## Open Questions
- Is the reframed "desk module" pitch strong enough for the hackathon judges?
- Can you source an RC522 module locally?
- Is this worth pursuing given competing ideas are stronger with these hardware constraints?
