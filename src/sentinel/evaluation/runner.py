"""Red-team evaluation harness.

A guard whose detection quality is unmeasured is a guard nobody should trust.
This runner scores the guard against a labeled corpus and reports the metrics
that actually matter for a security filter.

False-positive rate is reported as a headline number, not a footnote: a guard
that blocks legitimate traffic gets switched off, so FPR is what determines
whether a filter survives contact with production.
"""

import json
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class EvalReport:
    """Detection quality over a labeled corpus."""

    precision: float
    recall: float
    f1: float
    fpr: float
    true_positives: int = 0
    false_positives: int = 0
    true_negatives: int = 0
    false_negatives: int = 0
    per_detector: dict[str, int] = field(default_factory=dict)
    misses: list[str] = field(default_factory=list)
    false_alarms: list[str] = field(default_factory=list)

    def format(self) -> str:
        """Render a human-readable report."""
        lines = [
            "Prompt Sentinel evaluation",
            "=" * 46,
            f"  Precision : {self.precision:.3f}",
            f"  Recall    : {self.recall:.3f}",
            f"  F1        : {self.f1:.3f}",
            f"  FPR       : {self.fpr:.3f}",
            "",
            f"  TP {self.true_positives}  FP {self.false_positives}  "
            f"TN {self.true_negatives}  FN {self.false_negatives}",
        ]
        if self.per_detector:
            lines.append("")
            lines.append("  Detector contribution (true positives):")
            for name, count in sorted(
                self.per_detector.items(), key=lambda kv: -kv[1]
            ):
                lines.append(f"    {name:<22} {count}")
        if self.misses:
            lines.append("")
            lines.append(f"  Missed attacks ({len(self.misses)}):")
            for text in self.misses[:10]:
                lines.append(f"    - {text[:70]}")
        if self.false_alarms:
            lines.append("")
            lines.append(f"  False alarms ({len(self.false_alarms)}):")
            for text in self.false_alarms[:10]:
                lines.append(f"    - {text[:70]}")
        return "\n".join(lines)


def load_corpus(path: str | Path) -> list[dict]:
    """Read a JSONL corpus of {text, label, family} records."""
    records = []
    with open(path, encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    return records


def run_eval(sentinel, corpus_path: str | Path) -> EvalReport:
    """Score `sentinel` against the labeled corpus at `corpus_path`."""
    records = load_corpus(corpus_path)

    tp = fp = tn = fn = 0
    per_detector: dict[str, int] = {}
    misses: list[str] = []
    false_alarms: list[str] = []

    for record in records:
        text = record["text"]
        is_attack = record["label"] == "attack"
        verdict = sentinel.check(text)

        if is_attack and verdict.blocked:
            tp += 1
            for signal in verdict.reasons:
                per_detector[signal.detector] = per_detector.get(signal.detector, 0) + 1
        elif is_attack and not verdict.blocked:
            fn += 1
            misses.append(text)
        elif not is_attack and verdict.blocked:
            fp += 1
            false_alarms.append(text)
        else:
            tn += 1

    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0
    fpr = fp / (fp + tn) if (fp + tn) else 0.0

    return EvalReport(
        precision=precision,
        recall=recall,
        f1=f1,
        fpr=fpr,
        true_positives=tp,
        false_positives=fp,
        true_negatives=tn,
        false_negatives=fn,
        per_detector=per_detector,
        misses=misses,
        false_alarms=false_alarms,
    )
