"""Data contracts for the guard.

Explainability is a first-class output, not an afterthought: every Verdict
carries the Signals that produced it, so a caller can always answer "why?".
"""

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Signal:
    """One piece of evidence emitted by one detector.

    Attributes:
        detector: Name of the detector that produced this signal.
        weight: Confidence in [0.0, 1.0]. Higher means more suspicious.
        evidence: The matched substring, for human review.
        span: Optional (start, end) offsets of the match within the input.
    """

    detector: str
    weight: float
    evidence: str
    span: tuple[int, int] | None = None


@dataclass(frozen=True)
class Verdict:
    """The result of a guard check.

    Attributes:
        blocked: True when the aggregate score met or exceeded the threshold.
        score: Aggregate suspicion score in [0.0, 1.0].
        reasons: Every Signal that contributed. Empty means nothing fired.
        error: Set when one or more detectors failed, so degraded results are
            never silently indistinguishable from clean ones.
    """

    blocked: bool
    score: float
    reasons: list[Signal] = field(default_factory=list)
    error: str | None = None
