"""The public entry point.

`Sentinel.check()` is the only function most callers need. It must never raise:
a guard that crashes its host application is worse than no guard, so detector
failures are contained and surfaced through `Verdict.error` instead.
"""

from dataclasses import replace

from sentinel.detectors.delimiter_injection import DelimiterInjection
from sentinel.detectors.encoding_obfuscation import EncodingObfuscation
from sentinel.detectors.instruction_override import InstructionOverride
from sentinel.detectors.roleplay_jailbreak import RoleplayJailbreak
from sentinel.detectors.system_prompt_exfil import SystemPromptExfil
from sentinel.normalization import variants as text_variants
from sentinel.scoring import ScoringEngine
from sentinel.types import Signal, Verdict

#: Error policies for a detector that raises.
FAIL_CLOSED = "suspicious"
FAIL_OPEN = "allow"


def default_detectors() -> list:
    """The v1 heuristic detector set."""
    return [
        InstructionOverride(),
        RoleplayJailbreak(),
        DelimiterInjection(),
        EncodingObfuscation(),
        SystemPromptExfil(),
    ]


class Sentinel:
    """Scans text for prompt-injection and jailbreak attempts.

    Args:
        detectors: Detector instances to run. Defaults to the v1 heuristic set.
        threshold: Score at or above which input is blocked.
        on_detector_error: ``"suspicious"`` (default, fail-closed) treats input
            as blocked when a detector crashes; ``"allow"`` logs the failure in
            ``Verdict.error`` but does not block on it alone.
        max_length: Input longer than this is truncated before scanning, so
            pathological input cannot become a denial-of-service vector.
    """

    def __init__(
        self,
        detectors: list | None = None,
        threshold: float = 0.5,
        on_detector_error: str = FAIL_CLOSED,
        max_length: int = 20_000,
        normalize: bool = True,
    ) -> None:
        if on_detector_error not in (FAIL_CLOSED, FAIL_OPEN):
            raise ValueError(
                f"on_detector_error must be {FAIL_CLOSED!r} or {FAIL_OPEN!r}, "
                f"got {on_detector_error!r}"
            )
        self.detectors = default_detectors() if detectors is None else detectors
        self.engine = ScoringEngine(threshold=threshold)
        self.on_detector_error = on_detector_error
        self.max_length = max_length
        self.normalize = normalize

    def check(self, text: str) -> Verdict:
        """Scan text and return an explainable Verdict. Never raises."""
        if not isinstance(text, str):
            text = str(text)

        truncated = text[: self.max_length]

        # Scan the raw text, then the normalized form, so trivial obfuscation
        # (leetspeak, homoglyphs, separator punctuation) cannot evade a literal
        # pattern. Scanning both keeps raw-only signals such as invisible
        # characters, which normalization deliberately strips.
        scan_targets = text_variants(truncated) if self.normalize else [truncated]

        signals: list[Signal] = []
        errors: list[str] = []
        seen: set[tuple[str, str]] = set()

        for detector in self.detectors:
            name = getattr(detector, "name", detector.__class__.__name__)
            for index, variant in enumerate(scan_targets):
                try:
                    for signal in detector.scan(variant):
                        key = (signal.detector, signal.evidence.lower())
                        if key in seen:
                            continue
                        seen.add(key)
                        # Offsets from the normalized variant do not map back
                        # onto the original string, so they are dropped.
                        signals.append(
                            signal if index == 0 else replace(signal, span=None)
                        )
                except Exception as exc:  # noqa: BLE001 - containment is the point
                    errors.append(f"{name}: {exc}")
                    break

        score = self.engine.aggregate(signals)
        blocked = self.engine.is_blocked(score)

        error = "; ".join(errors) if errors else None
        if errors and self.on_detector_error == FAIL_CLOSED:
            # Degraded guard: prefer a false positive over an undetected attack.
            blocked = True

        return Verdict(blocked=blocked, score=score, reasons=signals, error=error)
