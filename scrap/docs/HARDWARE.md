# Hardware

## Boards
| Board | Role | Port |
|-------|------|------|
| Arduino Uno R3 | Servo PWM driver + chord keyboard reader | `/dev/ttyACM0` (Linux) or `COMx` (Windows) — auto-detected by `serial_bridge.py` |

## Components
| Component | Model | Qty | Est. Cost | Notes |
|-----------|-------|-----|-----------|-------|
| Micro servo | SG90 9g 180° | 6 | ~$1 each | One per Braille dot position |
| USB webcam | Logitech C270 or similar 720p+ | 1 | ~$12 | Plugs into laptop; not Arduino |
| Tactile pushbuttons | 12mm momentary NO | 6 | ~$2 total | Chord keyboard input |
| Toothpicks / 3mm dowel | — | 6 | ~$0.50 | Braille pins; cut to 25mm |
| Small rubber bands | — | 6 | ~$0.50 | Pin return spring |
| External 5V supply | USB power bank or 4×AA holder | 1 | ~$5 | Powers servos — NOT Arduino 5V pin |
| Cardboard | Medium-weight (cereal box) | — | free | Enclosure + servo mount platform |
| Hot glue + sticks | — | — | ~$1.50 | Servo mounting, cam disc |
| Jumper wires | M-M and M-F | ~30 | ~$3 | — |
| Breadboard | Small | 1 | have | — |

**Total est.: ~$30**

## Pinout — Arduino Uno R3

### Servo outputs (display)
```
Arduino Pin | Braille Dot | Servo Color
------------|-------------|------------
D3  (PWM)   | Dot 1       | Orange = signal
D5  (PWM)   | Dot 2       | Red    = 5V (external rail)
D6  (PWM)   | Dot 3       | Brown  = GND (common rail)
D9  (PWM)   | Dot 4       |
D10 (PWM)   | Dot 5       |
D11 (PWM)   | Dot 6       |
```

### Chord keyboard inputs (dots 1–6)
```
Arduino Pin | Braille Dot | Finger (standard)
------------|-------------|------------------
A0          | Dot 1       | Left index
A1          | Dot 2       | Left middle
A2          | Dot 3       | Left ring
A3          | Dot 4       | Right index
A4          | Dot 5       | Right middle
A5          | Dot 6       | Right ring
```

### Control buttons
```
Arduino Pin | Function       | Sends byte | Physical position
------------|----------------|------------|--------------------
D2          | Finish letter  | 0x41       | Column 3, top
D4          | Backspace      | 0x42       | Column 3, middle
D7          | Send           | 0x43       | Column 3, bottom
D8          | Space          | 0x40       | Below column 2
```

All 10 button pins use `INPUT_PULLUP`. Wire one leg to pin, other leg to GND.

### Physical button layout
```
[ dot 1 ]  [ dot 4 ]  [ FINISH ]
[ dot 2 ]  [ dot 5 ]  [ BKSPC  ]
[ dot 3 ]  [ dot 6 ]  [ SEND   ]
           [ SPACE  ]
```

### Reserved
```
D0 (RX) / D1 (TX) — USB serial to laptop (do not connect anything here)
```

## Power Wiring

```
6× SG90 peak stall current = ~150mA each = ~900mA total
Arduino 5V pin max output  = ~500mA

→ NEVER power servos from Arduino 5V pin.

Correct wiring:
  External 5V source  →  breadboard 5V rail
  All servo VCC (red) →  breadboard 5V rail
  All servo GND (brn) →  breadboard GND rail
  Arduino GND         →  same GND rail      (shared ground — critical)
  Arduino 5V pin      →  NOT connected to servos
```

## Physical Build

### Enclosure dimensions (approximate)
```
120mm × 80mm × 40mm cardboard box
  Bottom layer (0–20mm): Arduino Uno + breadboard
  Top layer (20–40mm):   Servo array + pin guide platform
  Top panel:             2×3 grid of 2mm holes for Braille pins
```

### Braille cell hole positions
Standard spacing: 2.3mm center-to-center (both horizontal and vertical).
Keep positions precise — tactile resolution depends on it.

### Servo layout (top view, servo layer)
Servos cannot fit inline at 2.3mm spacing (body is 23mm wide). Use alternating orientation:
```
  [PIN 1]  [PIN 2]  [PIN 3]    ← left column
  [SRV→]   [←SRV]  [SRV→]    ← alternating facing direction

  [PIN 4]  [PIN 5]  [PIN 6]    ← right column
  [←SRV]   [SRV→]  [←SRV]
```
Stagger rows vertically by 5mm so servo bodies don't collide. Use angled cardboard brackets (45°) hot-glued to hold each servo at the correct height.

### Pin mechanism (per dot)
1. Cut a cardboard guide sleeve (8mm tall, 3mm inner ∅); glue vertically below each hole.
2. Pin (toothpick/dowel, 25mm) slides through sleeve and up through top panel hole.
3. SG90 servo sits horizontally below; glue a cardboard cam disc (8mm ∅) off-center (~3mm from horn pivot) onto the servo horn.
4. At 0°: cam flat → pin down (dot not raised).
5. At 90°: cam edge rotates up → pushes pin up ~4–5mm (dot raised, fingertip-detectable).
6. Rubber band looped around pin shaft provides return force when servo returns to 0°.

### Camera mount
- Hot-glue camera to a cardboard L-bracket angled 10–15° downward.
- Mount on one short edge of the box.
- Route USB cable inside wall; notch back panel for cable exit.
- Target: face clearly captured at 50–100cm from device.

## Serial Protocol
- **Baud rate**: 9600
- **PC → Arduino**: single byte, 6-bit bitmask (see `docs/ARCHITECTURE.md`)
- **Arduino → PC**: single byte, 6-bit chord bitmask on key release

## Known Hardware Issues / Gotchas
- Servo jitter when first powered: stagger `dots[i].attach()` calls with 50ms delay each (already in firmware)
- Pins not rising far enough: increase `UP` angle from 90° to 100–110° in firmware; or reposition cam disc further off-center
- Rubber bands too tight: use the thinnest bands available; too much return force prevents servos from raising pins
- MediaPipe iris detection fails under backlight: position camera so face is front-lit
