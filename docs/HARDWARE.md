# Hardware

## Boards
| Board | Role | Port (dev) |
|-------|------|-----------|
| Arduino (TBD model) | Servo control, LED strip control, LED screen | /dev/ttyUSB0 or /dev/ttyACM0 |

## Sensors & Actuators
| Component | Model | Pin(s) | Notes |
|-----------|-------|--------|-------|
| Camera | USB webcam or Raspberry Pi Camera | — | Connected to host PC/Pi, not Arduino directly |
| Servos | TBD | D9, D10 | Robot movement / expressiveness |
| LED screen | TBD (OLED / TFT) | SPI or I2C | Displays text/expressions on robot face |
| LED strip | WS2812B (NeoPixel) or similar | D6 | Ambient room lighting |

## Pinout
```
Arduino Pin  | Connected To       | Direction | Notes
-------------|-------------------|-----------|------
D6           | LED strip (DIN)   | OUT       | NeoPixel data line; use 300–500Ω series resistor
D9           | Servo 1 (signal)  | OUT       | Head tilt or arm
D10          | Servo 2 (signal)  | OUT       | Head pan or second arm
SDA (A4)     | LED screen        | OUT       | If I2C display
SCL (A5)     | LED screen        | OUT       | If I2C display
```

## Serial Protocol
- **Baud rate**: 115200
- **Message format**: JSON line (`\n`-terminated)
- **Direction**: Python backend → Arduino (commands); Arduino → Python (ack/status)
- **Example command**: `{"cmd": "led", "color": [255, 100, 0], "brightness": 180}`
- **Example command**: `{"cmd": "servo", "id": 1, "angle": 90}`
- **Example command**: `{"cmd": "screen", "text": "You got this!", "icon": "smile"}`

## Wiring Notes
- LED strip: add a 1000µF capacitor across the strip power rails to prevent power surges
- Servos: power from external 5V supply, not Arduino 5V pin (current draw too high)
- NeoPixels: level-shift data line to 5V if running Arduino at 3.3V

## Known Hardware Issues
<!-- Fill in as discovered -->
