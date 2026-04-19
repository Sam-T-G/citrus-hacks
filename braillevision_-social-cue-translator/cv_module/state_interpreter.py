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

        ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)
        top_state, top_score = ranked[0]
        second_score = ranked[1][1]

        if top_score < self.min_score:
            return "neutral", scores
        if top_score - second_score < self.min_margin:
            return "uncertain", scores

        return top_state, scores
