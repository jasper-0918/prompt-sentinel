import pytest

from sentinel.scoring import ScoringEngine
from sentinel.types import Signal


def sig(w: float) -> Signal:
    return Signal(detector="X", weight=w, evidence="e")


@pytest.fixture
def engine():
    return ScoringEngine(threshold=0.5)


def test_no_signals_scores_zero(engine):
    assert engine.aggregate([]) == 0.0


def test_single_signal_returns_its_weight(engine):
    assert engine.aggregate([sig(0.7)]) == pytest.approx(0.7)


def test_score_never_exceeds_one(engine):
    assert engine.aggregate([sig(0.9)] * 10) <= 1.0


def test_multiple_weak_signals_do_not_beat_one_strong_signal(engine):
    weak = engine.aggregate([sig(0.1), sig(0.1), sig(0.1)])
    strong = engine.aggregate([sig(0.9)])
    assert weak < strong


def test_more_evidence_increases_score(engine):
    assert engine.aggregate([sig(0.4), sig(0.4)]) > engine.aggregate([sig(0.4)])


def test_threshold_decides_blocking(engine):
    assert engine.is_blocked(0.51) is True
    assert engine.is_blocked(0.49) is False


def test_out_of_range_weights_are_clamped(engine):
    assert engine.aggregate([sig(5.0)]) <= 1.0
    assert engine.aggregate([sig(-3.0)]) == 0.0


def test_invalid_threshold_rejected():
    with pytest.raises(ValueError):
        ScoringEngine(threshold=1.5)
