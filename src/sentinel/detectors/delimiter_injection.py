"""Detects forged conversation structure.

Chat models are fed a transcript of role-tagged turns. If untrusted user text
can inject something that *looks* like a new turn, it may be interpreted as one,
letting an attacker impersonate the system or pre-fill an assistant reply.

Position is the discriminator, not the token. "The system: a distributed queue"
contains ``system:`` but is ordinary prose; a forged turn appears at the *start
of a line*. Matching anchored to line starts keeps incidental punctuation clean
while still catching a payload smuggled in after a newline.
"""

import re

from sentinel.types import Signal

# A role tag at the start of a line, which is where a forged turn would appear.
_ROLE_LINE_RE = re.compile(
    r"^[ \t>*-]{0,4}(?:system|assistant|user|human|ai|model)[ \t]*:",
    re.IGNORECASE | re.MULTILINE,
)

# Chat-template control tokens that should never appear in user-supplied text.
_SPECIAL_TOKEN_RE = re.compile(
    r"<\|[a-z0-9_]+\|>"           # ChatML: <|im_start|>, <|im_end|>
    r"|\[/?INST\]"                 # Llama instruction tags
    r"|<</?SYS>>"                  # Llama system tags
    r"|<\|(?:begin|end)_of_text\|>"
    r"|\B#{2,}\s*(?:system|assistant|user|instruction)\s*#{2,}",  # ### SYSTEM ###
    re.IGNORECASE,
)


class DelimiterInjection:
    """Flags text that forges conversation-turn structure."""

    name = "DelimiterInjection"

    def scan(self, text: str) -> list[Signal]:
        if not text:
            return []

        signals: list[Signal] = []
        for pattern, weight in ((_ROLE_LINE_RE, 0.75), (_SPECIAL_TOKEN_RE, 0.9)):
            for match in pattern.finditer(text):
                signals.append(
                    Signal(
                        detector=self.name,
                        weight=weight,
                        evidence=match.group(0).strip(),
                        span=match.span(),
                    )
                )
        return signals
