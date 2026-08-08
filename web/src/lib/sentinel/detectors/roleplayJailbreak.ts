/**
 * Detects persona-based attempts to remove model restrictions.
 *
 * ─── YOUR TASK ───────────────────────────────────────────────────────────
 * Tests: `tests/detectors/roleplayJailbreak.test.ts`
 * Run:   npm test -- roleplayJailbreak
 * Python reference: `src/sentinel/detectors/roleplay_jailbreak.py`
 *
 * The insight: role assignment alone is benign and extremely common. "Act as a
 * proofreader" is a normal request. What makes it a jailbreak is role
 * assignment *combined with restriction removal*, or a named jailbreak persona.
 *
 * So fire on either:
 *   - a known jailbreak name (DAN, "do anything now", jailbreak, opposite day), or
 *   - a persona cue ("pretend", "act as", "you are now") followed *closely* by
 *     restriction-removal language ("with no rules", "without any content policy").
 *
 * Watch the benign cases in the test file. "Write a story where the character
 * has no fear" must stay clean: "no fear" is not restriction language.
 *
 * Note "developer mode" is deliberately NOT a standalone name here. It is a
 * real product feature, so it needs an activation verb ("enable developer
 * mode") to count. That was a real false positive in the Python version.
 * ─────────────────────────────────────────────────────────────────────────
 */

import type { Detector, DetectorName, Signal } from "../types";

export class RoleplayJailbreak implements Detector {
  readonly name: DetectorName = "RoleplayJailbreak";

  scan(text: string): Signal[] {
    if (!text) return [];
    // TODO(jasper): implement. See instructionOverride.ts for the shape.
    return [];
  }
}
