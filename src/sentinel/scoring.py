"""Signal aggregation.

The combination rule has to satisfy three constraints that pull against each
other:

1. The score must never exceed 1.0.
2. Several weak signals must not outrank one strong signal.
3. More corroborating evidence must still raise the score.

Naive summation violates (1) and (2); taking the maximum violates (3). The rule
used here is **noisy-OR**, the probability that at least one independent signal
is a true positive:

    score = 1 - product(1 - w for w in weights)

It is bounded above by 1.0 by construction, it is monotonically increasing in
the number of signals, and it degrades gracefully: three 0.1 signals combine to
0.271, still well below a single 0.9 signal.
"""

from sentinel.types import Signal


class ScoringEngine:
    """Combines detector signals into a single suspicion score."""

    def __init__(self, threshold: float = 0.5) -> None:
        if not 0.0 <= threshold <= 1.0:
            raise ValueError(f"threshold must be in [0.0, 1.0], got {threshold}")
        self.threshold = threshold

    def aggregate(self, signals: list[Signal]) -> float:
        """Combine signal weights via noisy-OR into a score in [0.0, 1.0]."""
        remaining = 1.0
        for signal in signals:
            weight = min(max(signal.weight, 0.0), 1.0)
            remaining *= 1.0 - weight
        score = 1.0 - remaining
        # Guard against float drift so the contract [0.0, 1.0] holds exactly.
        return min(max(score, 0.0), 1.0)

    def is_blocked(self, score: float) -> bool:
        """True when the score meets or exceeds the configured threshold."""
        return score >= self.threshold
