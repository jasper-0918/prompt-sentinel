"""Detects persona-based attempts to remove model restrictions.

Role assignment on its own is benign and extremely common: "act as a
proofreader" is a normal request. What makes a jailbreak is role assignment
*combined with restriction removal*, or a named jailbreak persona.

So this detector fires on either:

* a known jailbreak name (DAN, developer mode, ...), or
* a persona cue ("pretend", "act as", "you are now") followed closely by
  restriction-removal language ("with no rules", "without any content policy").

"Write a story where the character has no fear" therefore stays clean: "no
fear" is not restriction language, and no persona cue targets the model.
"""

import re

from sentinel.types import Signal

# Unambiguous jailbreak persona names. These have no legitimate meaning in
# ordinary product language, so the name alone is evidence.
_NAMED_JAILBREAK_RE = re.compile(
    r"\b(?:DAN|STAN|AIM|DUDE|do\s+anything\s+now"
    r"|jailbreak|jail\s?broken|opposite\s+day)\b",
    re.IGNORECASE,
)

# "developer mode" and friends are real product features, so the name alone is
# not evidence ("our developer mode toggle is documented in the settings
# guide"). Requiring an activation verb separates the attack from the noun.
# This was a false positive found during evaluation.
_MODE_ACTIVATION_RE = re.compile(
    r"\b(?:enable|activate|enter|turn\s+on|switch\s+to|engage|unlock)\s+"
    r"(?:the\s+)?(?:developer|dev|god|sudo|debug|admin|root)\s*mode\b",
    re.IGNORECASE,
)

# Language that removes or denies constraints.
_UNRESTRICTED = (
    r"(?:(?:no|without|free\s+from|not\s+bound\s+by|devoid\s+of|lacking)"
    r"\s+(?:any\s+|your\s+|all\s+|the\s+)?"
    r"(?:restrictions?|rules?|filters?|guidelines?|limitations?|constraints?"
    r"|content\s+polic(?:y|ies)|ethics|morals?|censorship|boundaries|safeguards?)"
    r"|unfiltered|unrestricted|uncensored|unbounded|unlimited\s+mode)"
)

# A persona cue aimed at the model, followed by restriction removal nearby.
_PERSONA_RE = re.compile(
    r"\b(?:pretend|act\s+as|acting\s+as|roleplay|role-play|simulate|imagine\s+you"
    r"|you\s+are\s+now|you\s+will\s+now|from\s+now\s+on|behave\s+as)\b"
    rf"[^.!?]{{0,90}}?{_UNRESTRICTED}",
    re.IGNORECASE | re.DOTALL,
)

# Direct denial of the model's own constraints, without a persona cue.
_DENIAL_RE = re.compile(
    r"\byou\s+(?:have|are)\s+(?:no|not\s+bound\s+by)\s+"
    r"(?:any\s+)?(?:restrictions?|rules?|limits?|guidelines?|filters?)\b",
    re.IGNORECASE,
)


class RoleplayJailbreak:
    """Flags persona framing used to strip model restrictions."""

    name = "RoleplayJailbreak"

    def scan(self, text: str) -> list[Signal]:
        if not text:
            return []

        signals: list[Signal] = []
        for pattern, weight in (
            (_NAMED_JAILBREAK_RE, 0.8),
            (_MODE_ACTIVATION_RE, 0.8),
            (_PERSONA_RE, 0.85),
            (_DENIAL_RE, 0.8),
        ):
            for match in pattern.finditer(text):
                signals.append(
                    Signal(
                        detector=self.name,
                        weight=weight,
                        evidence=match.group(0),
                        span=match.span(),
                    )
                )
        return signals
