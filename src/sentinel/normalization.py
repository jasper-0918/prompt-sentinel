"""Text normalization, applied before pattern matching.

Pattern matching is brittle against trivial mutation: ``Ign0re previ0us
instructi0ns`` and ``IGNORE-PREVIOUS-INSTRUCTIONS`` are the same attack as the
literal phrase, but a naive regex sees three different strings. Normalizing
first collapses that mutation space so one pattern covers all of them.

This closes the cheap bypasses only. Paraphrase, translation, and indirect
social engineering survive normalization by construction, because they are
semantic attacks and this is a lexical defense. That limit is the reason the
architecture keeps a slot for a model-based detector.
"""

import re
import unicodedata

# Visually-confusable substitutions used to evade literal matching.
_LEET_MAP = str.maketrans({
    "0": "o", "1": "i", "3": "e", "4": "a",
    "5": "s", "7": "t", "@": "a", "$": "s",
})

# Homoglyphs from other scripts that render like Latin letters.
_HOMOGLYPH_MAP = {
    "а": "a", "е": "e", "о": "o", "р": "p", "с": "c",
    "х": "x", "у": "y", "і": "i", "ѕ": "s", "һ": "h",
    "ο": "o", "α": "a", "ε": "e", "ρ": "p", "υ": "u",
}

_INVISIBLE_RE = re.compile(r"[​-‏‪-‮⁠-⁤﻿]")

# Punctuation used as a word separator: IGNORE-PREVIOUS-INSTRUCTIONS
_SEPARATOR_RE = re.compile(r"(?<=\w)[-_.·•|/\\]+(?=\w)")

# Letters spaced apart within one word: "i g n o r e". Single spaces only,
# because a wider gap is what separates one spaced-out word from the next.
_SPACED_LETTERS_RE = re.compile(r"\b(?:[A-Za-z][ ]){3,}[A-Za-z]\b")
_WORD_GAP_RE = re.compile(r"(\s{2,})")


def _collapse_spaced_letters(text: str) -> str:
    """Join "i g n o r e   a l l" into "ignore all", preserving word breaks.

    Collapsing the whole span at once would yield "ignoreall", which no
    word-boundary pattern can match, so runs of two or more spaces are treated
    as word separators and normalized to a single space.
    """
    pieces = []
    for piece in _WORD_GAP_RE.split(text):
        if piece and _WORD_GAP_RE.fullmatch(piece):
            pieces.append(" ")
        else:
            pieces.append(
                _SPACED_LETTERS_RE.sub(
                    lambda m: m.group(0).replace(" ", ""), piece
                )
            )
    return "".join(pieces)


def normalize(text: str, join_separators: bool = False) -> str:
    """Fold obfuscation variants onto their canonical form.

    Args:
        text: The input to normalize.
        join_separators: How to treat punctuation between word characters.
            ``False`` turns it into a space, recovering
            ``IGNORE-PREVIOUS-INSTRUCTIONS``. ``True`` deletes it, recovering
            ``Ig_no_re`` as ``Ignore``. The two are mutually exclusive, which
            is why `variants()` produces both and the guard scans each.

    Idempotent and lossy: use it for matching, never for display or storage.
    """
    if not text:
        return text

    text = unicodedata.normalize("NFKC", text)
    text = _INVISIBLE_RE.sub("", text)
    text = "".join(_HOMOGLYPH_MAP.get(c, c) for c in text)
    text = text.translate(_LEET_MAP)
    text = _SEPARATOR_RE.sub("" if join_separators else " ", text)
    text = _collapse_spaced_letters(text)
    return text


def variants(text: str) -> list[str]:
    """Return the distinct forms a guard should scan, original first.

    Separator punctuation has two plausible readings and they cannot both be
    applied at once, so both normalizations are produced and the caller scans
    each. Duplicates are dropped, so clean input costs exactly one scan.
    """
    if not text:
        return [text]

    out = [text]
    for candidate in (normalize(text), normalize(text, join_separators=True)):
        if candidate not in out:
            out.append(candidate)
    return out
