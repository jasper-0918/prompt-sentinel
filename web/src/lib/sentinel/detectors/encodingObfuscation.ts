/**
 * Detects payloads smuggled past naive filters by encoding or unicode tricks.
 *
 * ─── YOUR TASK (hardest of the four) ─────────────────────────────────────
 * Tests: `tests/detectors/encodingObfuscation.test.ts`
 * Run:   npm test -- encodingObfuscation
 * Python reference: `src/sentinel/detectors/encoding_obfuscation.py`
 *
 * A keyword filter only sees literal text, so attackers hide the payload:
 *   - base64 the instruction and ask the model to decode it
 *   - zero-width characters split a keyword so `ignore` no longer matches
 *   - homoglyphs swap Latin letters for identical-looking Cyrillic ones
 *
 * The approach is *decode, then judge* rather than pattern-match directly.
 *
 * The key insight, and the thing the benign tests punish: "contains base64" is
 * NOT evidence. A base64 avatar is perfectly ordinary. A blob is only
 * suspicious once it decodes to *printable text* that itself reads like an
 * instruction. Decode it, check it is human-readable, then look for markers.
 *
 * TypeScript notes:
 *   - `atob()` decodes base64 in the browser and in modern Node. It throws on
 *     invalid input, so wrap it.
 *   - There is no `str.isprintable()` in JS. Test against a control-character
 *     regex instead, e.g. /[\x00-\x08\x0E-\x1F\x7F]/.
 *   - For homoglyphs, detect a word mixing Latin with Cyrillic/Greek. JS has no
 *     `unicodedata.name`, but Unicode property escapes work:
 *     /\p{Script=Cyrillic}/u and /\p{Script=Latin}/u with the `u` flag.
 * ─────────────────────────────────────────────────────────────────────────
 */

import type { Detector, DetectorName, Signal } from "../types";

export class EncodingObfuscation implements Detector {
  readonly name: DetectorName = "EncodingObfuscation";

  scan(text: string): Signal[] {
    if (!text) return [];
    // TODO(jasper): implement. See instructionOverride.ts for the shape.
    return [];
  }
}
