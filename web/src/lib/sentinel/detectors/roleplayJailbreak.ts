/**
 * Detects persona-based attempts to remove model restrictions.
 * Mirrors `src/sentinel/detectors/roleplay_jailbreak.py`.
 *
 * Role assignment on its own is benign and extremely common: "act as a
 * proofreader" is a normal request. What makes a jailbreak is role assignment
 * *combined with restriction removal*, or a named jailbreak persona.
 *
 * So this fires on either:
 *   - a known jailbreak name (DAN, "do anything now", opposite day), or
 *   - a persona cue ("pretend", "act as", "you are now") followed closely by
 *     restriction-removal language ("with no rules", "without any content policy").
 *
 * "Write a story where the character has no fear" therefore stays clean: "no
 * fear" is not restriction language, and no persona cue targets the model.
 */

import type { Detector, DetectorName, Signal } from "../types";

/** Unambiguous jailbreak persona names. These have no legitimate meaning in
 *  ordinary product language, so the name alone is evidence. */
const NAMED_JAILBREAK_RE =
  /\b(?:DAN|STAN|AIM|DUDE|do\s+anything\s+now|jailbreak|jail\s?broken|opposite\s+day)\b/gi;

/**
 * "developer mode" and friends are real product features, so the name alone is
 * not evidence ("our developer mode toggle is documented in the settings
 * guide"). Requiring an activation verb separates the attack from the noun.
 * This was a false positive found during evaluation of the Python version.
 */
const MODE_ACTIVATION_RE =
  /\b(?:enable|activate|enter|turn\s+on|switch\s+to|engage|unlock)\s+(?:the\s+)?(?:developer|dev|god|sudo|debug|admin|root)\s*mode\b/gi;

/** Language that removes or denies constraints. */
const UNRESTRICTED =
  "(?:(?:no|without|free\\s+from|not\\s+bound\\s+by|devoid\\s+of|lacking)" +
  "\\s+(?:any\\s+|your\\s+|all\\s+|the\\s+)?" +
  "(?:restrictions?|rules?|filters?|guidelines?|limitations?|constraints?" +
  "|content\\s+polic(?:y|ies)|ethics|morals?|censorship|boundaries|safeguards?)" +
  "|unfiltered|unrestricted|uncensored|unbounded|unlimited\\s+mode)";

/** A persona cue aimed at the model, followed by restriction removal nearby.
 *  The window is bounded and stops at sentence punctuation, so an unrelated
 *  later sentence cannot be dragged in. */
const PERSONA_RE = new RegExp(
  "\\b(?:pretend|act\\s+as|acting\\s+as|roleplay|role-play|simulate|imagine\\s+you" +
    "|you\\s+are\\s+now|you\\s+will\\s+now|from\\s+now\\s+on|behave\\s+as)\\b" +
    `[^.!?]{0,90}?${UNRESTRICTED}`,
  "gi",
);

/** Direct denial of the model's own constraints, without a persona cue. */
const DENIAL_RE =
  /\byou\s+(?:have|are)\s+(?:no|not\s+bound\s+by)\s+(?:any\s+)?(?:restrictions?|rules?|limits?|guidelines?|filters?)\b/gi;

export class RoleplayJailbreak implements Detector {
  readonly name: DetectorName = "RoleplayJailbreak";

  scan(text: string): Signal[] {
    if (!text) return [];

    const signals: Signal[] = [];
    const patterns: ReadonlyArray<readonly [RegExp, number]> = [
      [NAMED_JAILBREAK_RE, 0.8],
      [MODE_ACTIVATION_RE, 0.8],
      [PERSONA_RE, 0.85],
      [DENIAL_RE, 0.8],
    ];

    for (const [pattern, weight] of patterns) {
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
