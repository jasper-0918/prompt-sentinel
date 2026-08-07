"""Detects attempts to countermand earlier instructions.

The discriminating idea is that an override attempt pairs an *imperative verb*
with a *reference to prior context* ("ignore ... previous instructions"). Simply
matching the verb produces false positives on ordinary prose such as
"ignore the noise in the dataset", so the verb alone is never enough.

Two deliberate choices keep the false-positive rate down:

* Only base-form verbs are matched. "How do I stop users from overriding my
  system prompt?" is a legitimate developer question; matching ``\\boverride\\b``
  will not fire on the gerund "overriding".
* The reference to prior context must appear within a short window after the
  verb, so an unrelated "previous" elsewhere in the sentence does not trigger.
"""

import re

from sentinel.types import Signal

# Base forms only. Gerunds and participles are excluded on purpose; see module docstring.
_VERB = r"(?:ignore|disregard|forget|override|bypass|discard|skip|omit)"

# A reference to prior context, or to the instruction set itself.
_TRIGGER = (
    r"(?:previous|prior|above|earlier|preceding|initial|original|foregoing"
    r"|everything|instructions?|directives?|rules?|guidelines?|constraints?"
    r"|restrictions?|policies|policy)"
)

# The object of the override, when the trigger was only a modifier
# ("previous" in "ignore previous instructions").
_OBJECT = r"(?:instructions?|directives?|rules?|guidelines?|prompts?|context|messages?)"

# Verb, then a reference to prior context within three words, optionally
# followed by the thing being overridden so the reported evidence reads as a
# whole phrase rather than a fragment. The bounded repetition keeps this
# ReDoS-safe.
_OVERRIDE_RE = re.compile(
    rf"\b{_VERB}\b(?:\s+\w+){{0,3}}?\s+\b{_TRIGGER}\b(?:\s+{_OBJECT}\b)?",
    re.IGNORECASE,
)

# "new instructions:" style redirection, which carries no verb.
_REDIRECT_RE = re.compile(
    r"\bnew\s+(?:instructions?|directives?|rules?|task|prompt)\s*[:\-]",
    re.IGNORECASE,
)


class InstructionOverride:
    """Flags text that tries to countermand prior instructions."""

    name = "InstructionOverride"

    def scan(self, text: str) -> list[Signal]:
        if not text:
            return []

        signals: list[Signal] = []
        for pattern, weight in ((_OVERRIDE_RE, 0.85), (_REDIRECT_RE, 0.7)):
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
