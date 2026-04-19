# Configuration for social cue thresholds and weights
SHORT_WINDOW_SECONDS = 3
LONG_WINDOW_SECONDS = 7
STATE_OUTPUT_COOLDOWN_SECONDS = 4
MIN_STATE_SCORE = 3
MIN_MARGIN = 1.5

CUE_WEIGHTS = {
    "smiling": {"friendly": 2, "engaged": 1},
    "looking_at_user": {"friendly": 1, "engaged": 2, "concerned": 1, "confused": 1},
    "looking_away": {"disengaged": 2},
    "brows_raised": {"confused": 2},
    "brows_furrowed": {"concerned": 2, "confused": 1, "disagreeing": 1},
    "nodding": {"engaged": 2},
    "head_shake": {"disagreeing": 3},
    "head_tilt": {"engaged": 1, "confused": 2},
    "leaning_in": {"engaged": 2, "concerned": 1},
    "leaning_back": {"disengaged": 2},
}
