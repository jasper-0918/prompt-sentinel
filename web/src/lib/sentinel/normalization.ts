/**
 * Text normalization, applied before pattern matching.
 * Mirrors `src/sentinel/normalization.py`.
 *
 * Pattern matching is brittle against trivial mutation: `Ign0re previ0us
 * instructi0ns` and `IGNORE-PREVIOUS-INSTRUCTIONS` are the same attack as the
 * literal phrase, but a naive regex sees three different strings. Normalizing
 * collapses that mutation space so one pattern covers all of them.
 *
 * This closes the cheap bypasses only. Paraphrase, translation, and indirect
 * social engineering survive normalization by construction, because they are
 * semantic attacks and this is a lexical defense.
 */

/** Visually-confusable substitutions used to evade literal matching. */
const LEET_MAP: Readonly<Record<string, string>> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  $: "s",
};

/** Homoglyphs from other scripts that render like Latin letters. */
const HOMOGLYPH_MAP: Readonly<Record<string, string>> = {
  а: "a", е: "e", о: "o", р: "p", с: "c",
  х: "x", у: "y", і: "i", ѕ: "s", һ: "h",
  ο: "o", α: "a", ε: "e", ρ: "p", υ: "u",
};

/** Zero-width and bidirectional control characters. */
const INVISIBLE_RE = /[​-‏‪-‮⁠-⁤﻿]/g;

/** Punctuation used as a word separator: IGNORE-PREVIOUS-INSTRUCTIONS */
const SEPARATOR_RE = /(?<=\w)[-_.·•|/\\]+(?=\w)/g;

/** Letters spaced apart within one word: "i g n o r e". Single spaces only,
 *  because a wider gap is what separates one spaced-out word from the next. */
const SPACED_LETTERS_RE = /\b(?:[A-Za-z] ){3,}[A-Za-z]\b/g;

const WORD_GAP_RE = /(\s{2,})/;

/**
 * Join "i g n o r e   a l l" into "ignore all", preserving word breaks.
 *
 * Collapsing the whole span at once would yield "ignoreall", which no
 * word-boundary pattern can match, so runs of two or more spaces are treated
 * as word separators.
 */
function collapseSpacedLetters(text: string): string {
  return text
    .split(WORD_GAP_RE)
    .map((piece) =>
      /^\s{2,}$/.test(piece)
        ? " "
        : piece.replace(SPACED_LETTERS_RE, (m) => m.replaceAll(" ", "")),
    )
    .join("");
}

/**
 * Fold obfuscation variants onto their canonical form.
 *
 * @param joinSeparators How to treat punctuation between word characters.
 *   `false` turns it into a space, recovering `IGNORE-PREVIOUS-INSTRUCTIONS`.
 *   `true` deletes it, recovering `Ig_no_re` as `Ignore`. The two readings are
 *   mutually exclusive, which is why {@link variants} produces both.
 *
 * Lossy: use for matching, never for display or storage.
 */
export function normalize(text: string, joinSeparators = false): string {
  if (!text) return text;

  let out = text.normalize("NFKC");
  out = out.replace(INVISIBLE_RE, "");
  out = [...out].map((c) => HOMOGLYPH_MAP[c] ?? c).join("");
  out = [...out].map((c) => LEET_MAP[c] ?? c).join("");
  out = out.replace(SEPARATOR_RE, joinSeparators ? "" : " ");
  out = collapseSpacedLetters(out);
  return out;
}

/**
 * The distinct forms a guard should scan, original first.
 *
 * Duplicates are dropped, so clean input costs exactly one scan.
 */
export function variants(text: string): string[] {
  if (!text) return [text];

  const out = [text];
  for (const candidate of [normalize(text), normalize(text, true)]) {
    if (!out.includes(candidate)) out.push(candidate);
  }
  return out;
}
