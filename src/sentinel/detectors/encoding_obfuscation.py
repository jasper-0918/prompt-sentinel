"""Detects payloads smuggled past naive filters by encoding or unicode tricks.

A keyword filter only sees literal text, so attackers hide the payload:

* **Base64** the instruction and ask the model to decode it.
* **Zero-width characters** split a keyword so ``ignore`` no longer matches
  while the model still reads it as one word.
* **Homoglyphs** swap Latin letters for identical-looking Cyrillic or Greek ones.

The approach is *normalise, then re-scan* rather than pattern-match directly.
Crucially, "contains base64" is not sufficient evidence: a base64 avatar is
perfectly ordinary. A candidate blob is only suspicious once it decodes to
printable text that itself looks like an instruction.
"""

import base64
import binascii
import re
import unicodedata

from sentinel.types import Signal

# Zero-width and bidirectional control characters used to break up keywords.
_INVISIBLE_RE = re.compile(r"[​-‏‪-‮⁠-⁤﻿]")

# Base64 candidates. Minimum length avoids flagging short hex-like tokens.
_B64_CANDIDATE_RE = re.compile(r"[A-Za-z0-9+/]{16,}={0,2}")

# Words that make a decoded payload suspicious.
_PAYLOAD_MARKERS = (
    "ignore", "disregard", "instruction", "system prompt", "jailbreak",
    "pretend", "reveal", "bypass", "override", "you are now", "forget",
)

_SCRIPT_PREFIXES = ("CYRILLIC", "GREEK", "ARMENIAN", "CHEROKEE")


def _decodes_to_suspicious_text(blob: str) -> str | None:
    """Return the decoded payload when a base64 blob hides an instruction."""
    padded = blob + "=" * (-len(blob) % 4)
    try:
        raw = base64.b64decode(padded, validate=True)
    except (binascii.Error, ValueError):
        return None

    try:
        decoded = raw.decode("utf-8")
    except UnicodeDecodeError:
        return None

    # Binary content (an image, a hash) decodes to unprintable bytes. Only
    # human-readable text can be a smuggled instruction.
    if not decoded.isprintable():
        return None

    lowered = decoded.lower()
    if any(marker in lowered for marker in _PAYLOAD_MARKERS):
        return decoded
    return None


def _mixed_script_words(text: str) -> list[str]:
    """Return words that mix Latin with a confusable script (homoglyph attack)."""
    found: list[str] = []
    for word in re.findall(r"\S+", text):
        letters = [c for c in word if c.isalpha()]
        if len(letters) < 2:
            continue
        has_latin = False
        has_other = False
        for char in letters:
            name = unicodedata.name(char, "")
            if name.startswith("LATIN"):
                has_latin = True
            elif name.startswith(_SCRIPT_PREFIXES):
                has_other = True
        if has_latin and has_other:
            found.append(word)
    return found


class EncodingObfuscation:
    """Flags encoded, invisible, or homoglyph-obfuscated payloads."""

    name = "EncodingObfuscation"

    def scan(self, text: str) -> list[Signal]:
        if not text:
            return []

        signals: list[Signal] = []

        for match in _INVISIBLE_RE.finditer(text):
            signals.append(
                Signal(
                    detector=self.name,
                    weight=0.7,
                    evidence=f"invisible character U+{ord(match.group(0)):04X}",
                    span=match.span(),
                )
            )
            break  # One signal is enough; do not spam per character.

        for match in _B64_CANDIDATE_RE.finditer(text):
            decoded = _decodes_to_suspicious_text(match.group(0))
            if decoded is not None:
                signals.append(
                    Signal(
                        detector=self.name,
                        weight=0.9,
                        evidence=f"base64 payload decodes to: {decoded[:80]!r}",
                        span=match.span(),
                    )
                )

        for word in _mixed_script_words(text):
            signals.append(
                Signal(
                    detector=self.name,
                    weight=0.75,
                    evidence=f"mixed-script word (possible homoglyph): {word!r}",
                )
            )

        return signals
