"""The Detector protocol.

This is the sole extension point of the library. A v2 local-ML classifier or a
v3 LLM-as-judge layer plugs in by implementing this same two-member interface,
with no change to the scoring engine or the facade.
"""

from typing import Protocol, runtime_checkable

from sentinel.types import Signal


@runtime_checkable
class Detector(Protocol):
    """A stateless, pure text scanner.

    Implementations must not perform I/O and should not raise for ordinary
    input. The facade defends against exceptions anyway, because a guard that
    crashes its host application is worse than no guard at all.
    """

    name: str

    def scan(self, text: str) -> list[Signal]:
        """Return zero or more Signals describing suspicious content."""
        ...
