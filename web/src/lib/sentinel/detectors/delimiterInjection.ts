/**
 * Detects forged conversation structure.
 * Mirrors `src/sentinel/detectors/delimiter_injection.py`.
 *
 * Chat models are fed a transcript of role-tagged turns. If untrusted user
 * text can inject something that *looks* like a new turn, it may be
 * interpreted as one, letting an attacker impersonate the system or pre-fill
 * an assistant reply.
 *
 * Position is the discriminator, not the token. "The system: a distributed
 * queue" contains `system:` but is ordinary prose; a forged turn appears at
 * the *start of a line*. Anchoring to line starts keeps incidental
 * punctuation clean while still catching a payload smuggled in after a newline.
 */

import type { Detector, DetectorName, Signal } from "../types";

/** A role tag at the start of a line, which is where a forged turn appears.
 *  The `m` flag is what makes `^` mean "start of line" rather than "start of
 *  string", and it is the whole reason the benign cases stay clean. */
const ROLE_LINE_RE = /^[ \t>*-]{0,4}(?:system|assistant|user|human|ai|model)[ \t]*:/gim;

/** Chat-template control tokens that should never appear in user-supplied text. */
const SPECIAL_TOKEN_RE =
  /<\|[a-z0-9_]+\|>|\[\/?INST\]|<<\/?SYS>>|\B#{2,}\s*(?:system|assistant|user|instruction)\s*#{2,}/gi;

export class DelimiterInjection implements Detector {
  readonly name: DetectorName = "DelimiterInjection";

  scan(text: string): Signal[] {
    if (!text) return [];

    const signals: Signal[] = [];
    const patterns: ReadonlyArray<readonly [RegExp, number]> = [
      [ROLE_LINE_RE, 0.75],
      [SPECIAL_TOKEN_RE, 0.9],
    ];

    for (const [pattern, weight] of patterns) {
      pattern.lastIndex = 0;
      for (const match of text.matchAll(pattern)) {
        signals.push({
          detector: this.name,
          weight,
          evidence: match[0].trim(),
          span: [match.index, match.index + match[0].length],
        });
      }
    }
    return signals;
  }
}
