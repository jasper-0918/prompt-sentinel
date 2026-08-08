/**
 * Detects attempts to countermand earlier instructions.
 * Mirrors `src/sentinel/detectors/instruction_override.py`.
 *
 * ─── REFERENCE IMPLEMENTATION ────────────────────────────────────────────
 * This is the worked example. The other four detectors follow the same shape:
 *
 *   1. Module-level regexes, compiled once (never build a regex inside scan).
 *   2. A class with a `name` matching its DetectorName, and `scan()`.
 *   3. Return `[]` for empty input, early.
 *   4. One Signal per match, carrying evidence and span for UI highlighting.
 *   5. Bounded quantifiers only, so the pattern cannot backtrack catastrophically.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * The discriminating idea is that an override attempt pairs an *imperative
 * verb* with a *reference to prior context* ("ignore ... previous
 * instructions"). Matching the verb alone produces false positives on ordinary
 * prose such as "ignore the noise in the dataset".
 *
 * Only base-form verbs are matched. "How do I stop users from overriding my
 * system prompt?" is a legitimate developer question, and `\boverride\b` does
 * not fire on the gerund "overriding".
 */

import type { Detector, DetectorName, Signal } from "../types";

const VERB = "(?:ignore|disregard|forget|override|bypass|discard|skip|omit)";

const TRIGGER =
  "(?:previous|prior|above|earlier|preceding|initial|original|foregoing" +
  "|everything|instructions?|directives?|rules?|guidelines?|constraints?" +
  "|restrictions?|policies|policy)";

/** The object of the override, so reported evidence reads as a whole phrase
 *  ("ignore previous instructions") rather than a fragment ("ignore previous"). */
const OBJECT =
  "(?:instructions?|directives?|rules?|guidelines?|prompts?|context|messages?)";

const OVERRIDE_RE = new RegExp(
  `\\b${VERB}\\b(?:\\s+\\w+){0,3}?\\s+\\b${TRIGGER}\\b(?:\\s+${OBJECT}\\b)?`,
  "gi",
);

/** "new instructions:" style redirection, which carries no verb. */
const REDIRECT_RE = /\bnew\s+(?:instructions?|directives?|rules?|task|prompt)\s*[:\-]/gi;

export class InstructionOverride implements Detector {
  readonly name: DetectorName = "InstructionOverride";

  scan(text: string): Signal[] {
    if (!text) return [];

    const signals: Signal[] = [];
    const patterns: ReadonlyArray<readonly [RegExp, number]> = [
      [OVERRIDE_RE, 0.85],
      [REDIRECT_RE, 0.7],
    ];

    for (const [pattern, weight] of patterns) {
      // Reset lastIndex: these are module-level /g regexes reused across calls,
      // and a stale lastIndex would silently skip matches on the next scan.
      pattern.lastIndex = 0;
      for (const match of text.matchAll(pattern)) {
        signals.push({
          detector: this.name,
          weight,
          evidence: match[0],
          span: [match.index, match.index + match[0].length],
        });
      }
    }
    return signals;
  }
}
