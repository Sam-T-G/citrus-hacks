import time

class EventManager:
    def __init__(self, cooldown_seconds=4):
        self.cooldown_seconds = cooldown_seconds
        self.last_state = None
        self.last_emit_time = 0

    def should_emit(self, state):
        now = time.time()
        if state in ("neutral", "uncertain"):
            return False
        if state != self.last_state:
            self.last_state = state
            self.last_emit_time = now
            return True
        if now - self.last_emit_time >= self.cooldown_seconds:
            self.last_emit_time = now
            return True
        return False
