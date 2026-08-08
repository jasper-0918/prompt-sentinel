/**
 * Detects payloads smuggled past naive filters by encoding or unicode tricks.
 * Mirrors `src/sentinel/detectors/encoding_obfuscation.py`.
 *
 * A keyword filter only sees literal text, so attackers hide the payload:
 *   - base64 the instruction and ask the model to decode it
 *   - zero-width characters split a keyword so `ignore` no longer matches
 *   - homoglyphs swap Latin letters for identical-looking Cyrillic ones
 *
 * The approach is *decode, then judge* rather than pattern-match directly.
 * Crucially, "contains base64" is not sufficient evidence: a base64 avatar is
 * perfectly ordinary. A blob is only suspicious once it decodes to printable
 * text that itself looks like an instruction.
 */

import type { Detector, DetectorName, Signal } from "../types";

/** Zero-width and bidirectional control characters used to break up keywords. */
const INVISIBLE_RE = /[​-‏‪-‮⁠-⁤﻿]/g;

/** Base64 candidates. The length floor avoids flagging short hex-like tokens. */
const B64_CANDIDATE_RE = /[A-Za-z0-9+/]{16,}={0,2}/g;

/** Words that make a decoded payload suspicious. */
const PAYLOAD_MARKERS = [
  "ignore", "disregard", "instruction", "system prompt", "jailbreak",
  "pretend", "reveal", "bypass", "override", "you are now", "forget",
] as const;

/** Scripts whose letters are commonly used as Latin look-alikes. */
const CONFUSABLE_SCRIPT_RE = /[\p{Script=Cyrillic}\p{Script=Greek}\p{Script=Armenian}]/u;
const LATIN_RE = /\p{Script=Latin}/u;

/**
 * Python's `str.isprintable()` treats control characters, and also newlines and
 * tabs, as non-printable. Matching that behaviour matters: it is what stops an
 * image blob, which decodes to control bytes, from being reported as an attack.
 */
function isPrintable(text: string): boolean {
  return text.length > 0 && !/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u.test(text);
}

/** Return the decoded payload when a base64 blob hides an instruction. */
function decodesToSuspiciousText(blob: string): string | null {
  const padded = blob + "=".repeat((4 - (blob.length % 4)) % 4);

  let decoded: string;
  try {
    decoded = atob(padded);
  } catch {
    return null;
  }

  // Binary content (an image, a hash) decodes to unprintable bytes. Only
  // human-readable text can be a smuggled instruction.
  if (!isPrintable(decoded)) return null;

  const lowered = decoded.toLowerCase();
  return PAYLOAD_MARKERS.some((marker) => lowered.includes(marker)) ? decoded : null;
}

/** Words that mix Latin with a confusable script, i.e. a homoglyph attack. */
function mixedScriptWords(text: string): string[] {
  const found: string[] = [];
  for (const word of text.split(/\s+/)) {
    const letters = [...word].filter((c) => /\p{L}/u.test(c));
    if (letters.length < 2) continue;
    const joined = letters.join("");
    if (LATIN_RE.test(joined) && CONFUSABLE_SCRIPT_RE.test(joined)) found.push(word);
  }
  return found;
}

export class EncodingObfuscation implements Detector {
  readonly name: DetectorName = "EncodingObfuscation";

  scan(text: string): Signal[] {
    if (!text) return [];

    const signals: Signal[] = [];

    INVISIBLE_RE.lastIndex = 0;
    const invisible = INVISIBLE_RE.exec(text);
    if (invisible) {
      // One signal is enough; do not emit one per character.
      const code = invisible[0].codePointAt(0) ?? 0;
      signals.push({
        detector: this.name,
        weight: 0.7,
        evidence: `invisible character U+${code.toString(16).toUpperCase().padStart(4, "0")}`,
        span: [invisible.index, invisible.index + invisible[0].length],
      });
    }

    B64_CANDIDATE_RE.lastIndex = 0;
    for (const match of text.matchAll(B64_CANDIDATE_RE)) {
      const decoded = decodesToSuspiciousText(match[0]);
      if (decoded !== null) {
        signals.push({
          detector: this.name,
          weight: 0.9,
          evidence: `base64 payload decodes to: ${JSON.stringify(decoded.slice(0, 80))}`,
          span: [match.index, match.index + match[0].length],
        });
      }
    }

    for (const word of mixedScriptWords(text)) {
      signals.push({
        detector: this.name,
        weight: 0.75,
        evidence: `mixed-script word (possible homoglyph): ${JSON.stringify(word)}`,
        span: null,
      });
    }

    return signals;
  }
}
