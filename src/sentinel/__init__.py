"""Prompt Sentinel: explainable prompt-injection and jailbreak detection."""

from sentinel.sentinel import FAIL_CLOSED, FAIL_OPEN, Sentinel, default_detectors
from sentinel.types import Signal, Verdict

__version__ = "0.1.0"

__all__ = [
    "Sentinel",
    "Signal",
    "Verdict",
    "default_detectors",
    "FAIL_CLOSED",
    "FAIL_OPEN",
]
