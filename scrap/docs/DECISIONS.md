# Decision Log

> Log non-obvious technical choices here. Format: decision, why, tradeoffs.
> LLMs: use this to understand *why* the code looks the way it does.

---

**Single byte per Braille cell over serial** — project start
- **Decision**: Send one raw byte (6-bit bitmask) per cell, not a JSON or text protocol
- **Why**: Minimizes serial latency and Arduino parsing complexity. No `ArduinoJson` dependency needed. Arduino firmware stays under 50 lines.
- **Tradeoff**: Less human-readable on the wire; can't easily extend without changing the protocol. Acceptable for a single-purpose device.

---

**Arduino Uno R3 (not ESP32 or Mega)** — project start
- **Decision**: Use Uno R3 as the only microcontroller
- **Why**: Only hardware available at the hackathon. Uno has exactly 6 PWM pins (D3, D5, D6, D9, D10, D11) — one per Braille dot — plus 6 analog pins (A0–A5) for the chord keyboard. Fits perfectly.
- **Tradeoff**: No WiFi (all API calls route through laptop serial). No extra pins if we want to expand beyond one Braille cell without a PCA9685 PWM driver.

---

**MediaPipe FaceMesh + Hands over a dedicated emotion model** — project start
- **Decision**: Use MediaPipe landmark geometry for cue detection instead of a trained emotion classifier (e.g. `fer`, `deepface`)
- **Why**: MediaPipe runs locally with no model download, works well under varied lighting, and gives us precise landmark coordinates for gaze/nod/brow detection — not just an emotion label. More flexible for nonverbal cue types.
- **Tradeoff**: Threshold-based classification is more brittle than a trained model; requires per-session calibration. Emotion labels like "angry" or "sad" are not directly available — only geometric proxies.

---

**Cardboard + hot glue enclosure** — project start
- **Decision**: Build the physical enclosure from cardboard rather than 3D printing or laser cutting
- **Why**: Materials on hand; 3D printing at a hackathon is unreliable (queue times, print failures). Cardboard is fast to iterate.
- **Tradeoff**: Less precise servo alignment; cam disc mechanism requires careful positioning. Acceptable for a proof-of-concept demo.

---

**Enlarged Braille cell scale (not standard 2.3mm spacing)** — project start
- **Decision**: Use larger dot spacing than the standard 2.3mm inter-dot distance
- **Why**: SG90 servo bodies are 23mm wide. At standard spacing, 6 servos cannot fit inline. Enlarged spacing (servo-dictated) is still fingertip-detectable and demonstrates the concept correctly.
- **Tradeoff**: Not compatible with standard Braille readers' muscle memory. Production version would use solenoids at standard spacing.

---

<!-- Add decisions below as they're made -->
