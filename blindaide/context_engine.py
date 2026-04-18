import time
from config import (
    GAZE_THRESHOLD, SMILE_THRESHOLD, BROW_THRESHOLD,
    NOD_THRESHOLD, FACE_NEAR_PX, FACE_FAR_PX, DEBOUNCE_SECS
)

CUE_LABELS = {
    'LOOKING':  'ATTN',
    'SMILE':    'SMILE',
    'SURPRISE': 'SURPR',
    'NOD':      'YES',
    'HAND':     'HAND',
    'AWAY':     'AWAY',
    'CLOSE':    'NEAR',
}


class ContextEngine:
    def __init__(self):
        self.last_cue  = None
        self.last_time = 0

    def process(self, cues):
        """
        Takes output dict from vision.analyze_frame().
        Returns a short label string to display, or None if nothing new.
        """
        if cues is None:
            return None

        detected = self._classify(cues)
        if detected is None:
            return None

        now = time.time()
        if detected == self.last_cue and (now - self.last_time) < DEBOUNCE_SECS:
            return None

        self.last_cue  = detected
        self.last_time = now
        return CUE_LABELS.get(detected)

    def _classify(self, c):
        # Priority: hand > surprise > nod > smile > gaze > proximity
        if c['hand_raised']:
            return 'HAND'
        if c['brow_raise'] is not None and c['brow_raise'] > BROW_THRESHOLD:
            return 'SURPRISE'
        if c['nod_pitch'] is not None and c['nod_pitch'] < NOD_THRESHOLD:
            return 'NOD'
        if c['smile_score'] is not None and c['smile_score'] > SMILE_THRESHOLD:
            return 'SMILE'
        if c['gaze_offset'] is not None and abs(c['gaze_offset']) < GAZE_THRESHOLD:
            return 'LOOKING'
        if c['face_size'] is not None:
            if c['face_size'] > FACE_NEAR_PX:
                return 'CLOSE'
            if c['face_size'] < FACE_FAR_PX:
                return 'AWAY'
        return None
