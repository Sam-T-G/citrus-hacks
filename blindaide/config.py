# Adjust these values during a 5-second calibration session at startup

# Vision thresholds
GAZE_THRESHOLD   = 0.018   # lower = stricter gaze detection
SMILE_THRESHOLD  = 0.005
BROW_THRESHOLD   = 0.04
NOD_THRESHOLD    = 0.28    # head pitch — lower value = more nodded
FACE_NEAR_PX     = 180     # face bounding box width in px
FACE_FAR_PX      = 80

# Serial
SERIAL_PORT      = None    # None = auto-detect
SERIAL_BAUD      = 9600

# Display
CELL_DURATION    = 0.6     # seconds to hold each braille cell
DEBOUNCE_SECS    = 1.5     # min seconds between same cue retriggers

# Audio
TTS_RATE         = 160     # words per minute
TTS_ENABLED      = True
