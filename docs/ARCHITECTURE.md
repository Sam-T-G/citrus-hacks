# Architecture

## System Overview
A mood-sensing robot that reads facial expressions via camera, infers emotional state using a vision model, generates a contextual verbal/text response via Claude API, and drives hardware outputs (LED strip, LED screen, servos) to create a reactive ambient environment.

## Component Map
```
[Camera] --> [Python Vision Layer]
                    |
              [Emotion Model]         (OpenCV + fer / deepface / similar)
                    |
              [Claude API]            (generates response text — motivational / jokes / etc.)
                    |
              [FastAPI Backend]
                    |
         +----------+-----------+
         |                      |
  [Arduino via Serial]    [Spotify API]   (optional playlist curation)
         |
  +------+-------+
  |       |      |
[Servos] [LEDs] [Screen]
```

## Data Flow
1. Camera captures frame every N seconds (or on motion trigger)
2. Python vision layer runs emotion detection → outputs dominant emotion + confidence
3. Claude API called with emotion context + user-selected mode (motivational / jokes / shittalk / comforting) → returns short response text
4. Response text sent to Arduino over serial → displayed on LED screen
5. Emotion mapped to LED color/animation → sent to Arduino → drives LED strip
6. Servo commands sent to Arduino for physical expressiveness (head tilt, etc.)
7. Optionally: emotion + mode sent to Spotify API to queue a matching playlist

## Emotion → Output Mapping (initial)
| Detected Emotion | LED Color | Servo Behavior | Playlist Vibe |
|-----------------|-----------|----------------|---------------|
| Happy | Warm yellow | Upright, slight bob | Upbeat pop |
| Sad | Soft blue | Drooped/slow | Lo-fi / chill |
| Angry | Red pulse | Still | Calm ambient |
| Stressed | Orange breathe | Gentle sway | Meditation |
| Neutral | White | Idle | None |

## Component Boundaries & Interfaces

### Python Vision ↔ Arduino
- **Transport**: USB Serial
- **Baud rate**: 115200
- **Format**: JSON lines (`\n`-terminated)
- **Message schema**:
  ```json
  {"cmd": "led",    "color": [R, G, B], "brightness": 0-255}
  {"cmd": "servo",  "id": 1,            "angle": 0-180}
  {"cmd": "screen", "text": "string",   "icon": "smile|sad|neutral"}
  ```

### Python ↔ Claude API
- **Transport**: HTTPS (Anthropic SDK)
- **Input**: emotion label + confidence + selected response mode
- **Output**: short string (1–3 sentences max) for display + speech

### Python ↔ Spotify (optional)
- **Transport**: HTTPS (Spotipy SDK)
- **Action**: start playback of a curated playlist by emotion tag

## File Structure (planned)
```
prototypes/
  led_strip/        # NeoPixel color/animation test
  servo_sweep/      # Servo range-of-motion test
  screen_hello/     # LED screen text rendering test
  serial_cmd/       # JSON command parser on Arduino
src/
  vision/           # emotion detection pipeline
  api/              # FastAPI server + Claude integration
  arduino/          # production Arduino sketch
docs/
```
