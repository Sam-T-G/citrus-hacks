# CV Social State Inference Design Spec

## Purpose
This document defines a concrete design for a computer vision module that:

1. detects **raw visual cues** from a speaker,
2. stores those cues in a **time-based log**,
3. analyzes the recent sequence of cues, and
4. outputs a cautious **interpretation of the speaker's likely social state**.

This system is intended for a braille/audio accessibility device, where the goal is not to "read minds" or claim perfect emotion detection, but to provide useful nonverbal context that a blind user may otherwise miss.

---

## Design Principle
Do **not** map a single frame directly to an emotion.

Use this pipeline instead:

```text
Camera Frame
  -> Landmark Detection
  -> Raw Cue Detection
  -> Cue Log (rolling memory)
  -> State Interpreter
  -> Output Manager
  -> Audio / Braille Feedback
```

---

## Pseudocode: Cue Log

```python
from collections import deque
import time

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
```

## Pseudocode: State Interpreter

```python
class StateInterpreter:
    def __init__(self, weights, min_score=3, min_margin=1.5):
        self.weights = weights
        self.min_score = min_score
        self.min_margin = min_margin

    def interpret(self, recent_events):
        scores = {
            "friendly": 0.0,
            "engaged": 0.0,
            "concerned": 0.0,
            "confused": 0.0,
            "disagreeing": 0.0,
            "disengaged": 0.0
        }

        for event in recent_events:
            cue = event["cue"]
            confidence = event.get("confidence", 1.0)
            if cue in self.weights:
                for state, weight in self.weights[cue].items():
                    scores[state] += weight * confidence

        # Top Ranking logic...
```
