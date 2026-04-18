# Idea: Sleep AI

## Concept
A smart alarm clock and sleep tracker that monitors movement via IMU to infer sleep cycles, wakes you gradually with a NeoPixel sunrise, refuses to stop alarming until real sustained movement is detected, and logs sleep quality with a scored dashboard.

---

## Hardware Constraints
- **Microcontroller**: Arduino Uno or Mega (no ESP32)
- **No WiFi on device** — sleep data posts to laptop backend via USB serial
- **Physical build**: cardboard box chassis for the bedside unit
- Laptop must stay connected overnight — acceptable for a hackathon demo, awkward for real use (but not a blocker)

### Impact of No WiFi
Moderate. Sleep tracking requires the laptop to stay on and tethered overnight. For a hackathon this is fine — demo can use pre-seeded data or an accelerated time simulation.

---

## Architecture

```
[Arduino Uno/Mega]
   ├── MPU-6050 (I2C) → acceleration samples @ 10Hz
   ├── DS3231 RTC (I2C) → scheduled alarm time
   ├── WS2812B LED strip → gradual sunrise ramp
   ├── Buzzer + vibration motor → alarm escalation
   ├── SSD1306 OLED → current time, sleep stage, alarm status
   └── Push button → set alarm / snooze override
          │
          │ USB Serial — streams {timestamp, rms_accel, stage} every 30s
          ▼
      [Laptop — Python]
          ├── SQLite: stores nightly sleep log
          ├── Sleep score algorithm
          └── Chart.js dashboard (served via FastAPI)
```

---

## Pin Budget

### Arduino Uno
```
Pin   | Use
------|-------------------------------
A4    | MPU-6050 SDA (I2C)
A5    | MPU-6050 SCL (I2C)
       (DS3231 + SSD1306 share same I2C bus — all different addresses)
D6    | WS2812B LED strip data
D3    | Buzzer (PWM tone)
D5    | Vibration motor (PWM)
D2    | Push button (interrupt-capable)
D0/D1 | Serial RX/TX
```
**Uno fits cleanly. 7 pins used. All 3 I2C devices (MPU-6050=0x68, DS3231=0x68 conflict!)**

### I2C Address Conflict — MPU-6050 vs DS3231
Both MPU-6050 and DS3231 default to I2C address **0x68**. This is a real conflict.

**Solutions:**
1. MPU-6050 has an AD0 pin — tie it HIGH to change its address to 0x69. Resolves conflict cleanly.
2. Use software I2C on different pins for one device (adds complexity).
3. Drop DS3231, use `millis()` on Arduino + NTP time set at startup from laptop. For a demo this is fine.

**Recommendation: Tie MPU-6050 AD0 to 3.3V → address becomes 0x69. DS3231 stays at 0x68.**

### Arduino Mega
No issues. More PWM pins, more I2C flexibility.

---

## Hardware Components — Revised List

| Component | Model | Est. Cost | Notes |
|-----------|-------|-----------|-------|
| Microcontroller | Arduino Uno or Mega | owned | |
| IMU | MPU-6050 I2C | ~$3 | Tie AD0 HIGH to resolve DS3231 address conflict |
| RTC | DS3231 I2C | ~$4 | Battery-backed; or drop and use millis() + laptop time sync |
| LED strip | WS2812B 1m 30 LEDs | ~$6 | Sunrise ramp; 5V external power recommended |
| Buzzer | Passive piezo | ~$1 | PWM tone — more control than active buzzer |
| Vibration motor | 1027 coin vibration motor | ~$2 | Run via transistor (NPN 2N2222) — don't drive directly from pin |
| OLED | SSD1306 128x64 I2C | ~$4 | Shares I2C bus |
| Push button | Tactile switch | <$1 | Alarm set / snooze |
| NPN transistor | 2N2222 or BC547 | <$1 | Drive vibration motor (50mA+, too much for digital pin) |
| 1kΩ resistor | — | <$1 | Base resistor for transistor |
| Cardboard box | On hand | $0 | Bedside unit enclosure |
| External 5V supply | Phone charger | ~$0 | For LED strip if using many LEDs at full brightness |

**Total new purchases: ~$15–20**

---

## Software Components

| Component | Library / Tool | Setup Time |
|-----------|---------------|------------|
| MPU-6050 | `MPU6050` or `Wire.h` + direct register reads | 30–45 min |
| DS3231 RTC | `RTClib` | 20 min |
| WS2812B sunrise | `Adafruit_NeoPixel` | 30 min |
| OLED | `Adafruit_SSD1306` + `Adafruit_GFX` | 30 min |
| Serial → Python | `pyserial` | 15 min |
| SQLite sleep log | `sqlite3` Python | 20 min |
| Sleep score algorithm | Custom Python function | 1 hr |
| Chart.js dashboard | HTML + Chart.js | 2–3 hr |
| Optional: Claude morning feedback | `anthropic` Python SDK | 45 min |

---

## Sleep Stage Classification

```
Arduino samples MPU-6050 acceleration at 10Hz.
Every 30 seconds: compute RMS of {ax, ay, az} readings.

RMS thresholds (calibrate at demo start):
  < 0.05g  → Deep Sleep   (very still)
  0.05–0.2g → Light Sleep  (small movements)
  0.2–0.5g  → REM proxy    (irregular shifts)
  > 0.5g   → Awake        (significant movement)

Send over serial every 30s:
{"ts": 1234567, "rms": 0.03, "stage": "deep"}
```

**Alarm clearance condition**: RMS > 0.5g sustained for 10+ consecutive seconds. Prevents "rolled over in sleep" from clearing the alarm.

---

## Sunrise Ramp Algorithm

```cpp
// Start 30 min before alarm (demo: 30 seconds before)
// Ramp brightness from 0 → 255 over ramp duration
// Color: warm white → bright yellow-white

void sunriseRamp(int durationMs) {
  for (int i = 0; i <= 255; i++) {
    int r = i;
    int g = (int)(i * 0.85);
    int b = (int)(i * 0.4);
    strip.fill(strip.Color(r, g, b));
    strip.setBrightness(i);
    strip.show();
    delay(durationMs / 255);
  }
}
```

---

## Sleep Score Algorithm

```python
def calculate_sleep_score(sessions):
    score = 60  # base
    duration_hrs = (sessions[-1]['ts'] - sessions[0]['ts']) / 3600

    if 7 <= duration_hrs <= 9:     score += 10
    elif duration_hrs < 6:          score -= 10

    deep_pct = sum(1 for s in sessions if s['stage'] == 'deep') / len(sessions)
    if deep_pct > 0.25:             score += 10

    interruptions = sum(1 for s in sessions if s['stage'] == 'awake')
    score -= max(0, (interruptions - 3) * 3)

    return max(0, min(100, score))
```

---

## Realistic Time Budget (24-hour hackathon)

| Phase | Task | Time Est. | Risk |
|-------|------|-----------|------|
| 0 | Wire Uno + MPU-6050 (AD0 HIGH) + DS3231 + OLED + LED strip + buzzer + vibe motor | 2 hr | Low — watch the I2C address conflict |
| 1 | Arduino: RTC alarm → LED sunrise ramp | 2 hr | Low |
| 2 | Arduino: alarm clears only on sustained MPU movement | 1.5 hr | Low–Medium |
| 3 | Arduino: MPU-6050 RMS calculation + sleep stage + serial output | 2 hr | Medium — threshold tuning takes iteration |
| 4 | Python: serial listener + SQLite logging | 1 hr | Low |
| 5 | Python: sleep score algorithm | 1 hr | Low |
| 6 | Chart.js dashboard | 2–3 hr | Medium — biggest time sink |
| 7 | Demo prep: pre-seed one night of fake sleep data | 30 min | Low |
| 8 | Optional: Claude morning feedback (1 sentence on wake) | 45 min | Low |
| 9 | Cardboard enclosure + polish | 1 hr | Low |
| **Total** | | **~14–17 hr** | Core (phases 1–3) is 5.5 hr; dashboard is optional |

---

## Demo Problem: Can't Demo Sleep Live

You can't sleep for 8 hours at a hackathon. Solutions:

1. **Accelerated mode**: rescale time 60x. 1 real minute = 1 "sleep hour". Demonstrate full night in 8 minutes. Firmware needs a `demo_mode` flag that scales `millis()` accordingly.
2. **Pre-seeded data**: load one night of realistic SQLite data before judging. Show the dashboard as "last night's results."
3. **Focus demo on the alarm**: "won't stop until you move" is instantly demonstrable and is the most relatable feature. This alone can carry the demo.

**Recommended: do all three. Pre-seed data, have accelerated mode ready, lead with the alarm demo.**

---

## Risk Matrix

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| MPU-6050 / DS3231 I2C address conflict | **Certain** | High | Tie MPU-6050 AD0 to 3.3V on day 1 |
| IMU thresholds wrong for demo setup | High | Medium | Add serial command to print live RMS; calibrate first |
| Vibration motor browns out Arduino pin | Medium | High | **Must use transistor** — 50mA exceeds pin limit |
| Dashboard takes 3+ hours | Medium | Medium | Use Chart.js CDN + minimal template; or cut and just show SQLite table |
| Laptop must stay on overnight for real use | High | Low | Known limitation; fine for hackathon demo |

---

## Core vs Cut

| Feature | Keep? |
|---------|-------|
| Gradual LED sunrise wake-up | Yes — visual wow |
| Alarm won't stop until sustained movement | Yes — unique selling point |
| Live sleep stage on OLED | Yes |
| MPU-6050 classification + serial log | Yes |
| Sleep score algorithm | Yes — simple to add |
| Dashboard with graphs | Optional — pre-seeded data |
| Temperature logging | Cut — not worth the pin |
| Phone usage (LDR) | Cut — LDR is a rough proxy, story doesn't land well |
| Claude morning feedback | Optional — 45 min if time allows |

---

## Demo Day Script
1. Show device: cardboard box, LED strip, OLED showing "Alarm: in 10 seconds"
2. LED strip begins gradual warm glow → brightens to yellow-white over 10 seconds (compressed sunrise)
3. At alarm time: buzzer sounds, OLED shows "WAKE UP — Move to dismiss"
4. Hold device still → alarm continues, OLED shows "Detecting sleep... still detecting..."
5. Shake vigorously for 10 seconds → alarm clears, OLED: "Good morning! 🌅 Sleep score: 74"
6. Flip to laptop dashboard: last night's sleep stage timeline + score breakdown
7. Optional: Claude feedback: "Your deep sleep was shorter than ideal. Try a consistent bedtime."

---

## Open Questions
- Uno vs Mega? (Uno fits; Mega gives more room if adding features)
- Cut DS3231 and use `millis()` + laptop time sync instead? (saves a component, loses battery-backed time)
- Dashboard: build it or pre-print a graph for demo table?
- Accelerated demo mode: implement in firmware or just pre-seed data?
- Claude morning feedback: worth 45 min?
