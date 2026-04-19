import time
from collections import deque

class CueLog:
    def __init__(self, window_seconds=7):
        self.window_seconds = window_seconds
        self.events = deque()

    def add_event(self, cue, confidence, source=None, duration=None):
        now = time.time()
        self.events.append({
            "timestamp": now,
            "cue": cue,
            "confidence": confidence,
            "source": source,
            "duration": duration
        })
        self.prune(now)

    def prune(self, now=None):
        if now is None:
            now = time.time()
        while self.events and now - self.events[0]["timestamp"] > self.window_seconds:
            self.events.popleft()

    def get_recent_events(self, seconds=None):
        now = time.time()
        if seconds is None:
            seconds = self.window_seconds
        return [
            event for event in self.events
            if now - event["timestamp"] <= seconds
        ]
