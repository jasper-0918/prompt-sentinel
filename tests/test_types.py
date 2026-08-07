from sentinel.types import Signal, Verdict


def test_signal_holds_evidence_and_weight():
    s = Signal(detector="InstructionOverride", weight=0.8, evidence="ignore previous instructions")
    assert s.detector == "InstructionOverride"
    assert s.weight == 0.8
    assert s.evidence == "ignore previous instructions"
    assert s.span is None


def test_verdict_defaults_to_no_error():
    v = Verdict(blocked=True, score=0.9, reasons=[])
    assert v.blocked is True
    assert v.score == 0.9
    assert v.reasons == []
    assert v.error is None
