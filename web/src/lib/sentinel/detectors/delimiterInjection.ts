/**
 * Detects forged conversation structure.
 *
 * ─── YOUR TASK ───────────────────────────────────────────────────────────
 * Tests: `tests/detectors/delimiterInjection.test.ts`
 * Run:   npm test -- delimiterInjection
 * Python reference: `src/sentinel/detectors/delimiter_injection.py`
 *
 * Chat models are fed a transcript of role-tagged turns. If untrusted text can
 * inject something that *looks* like a new turn, it may be interpreted as one,
 * letting an attacker impersonate the system or pre-fill an assistant reply.
 *
 * The discriminator is POSITION, not the token. "The system: a distributed
 * queue" contains `system:` but is ordinary prose. A forged turn appears at the
 * *start of a line*. Anchor to line starts and the benign cases stay clean.
 *
 * Two things to catch:
 *   - a role tag at the start of a line (system:, assistant:, user:, human:)
 *   - chat-template control tokens (<|im_start|>, [INST], <<SYS>>, ### SYSTEM ###)
 *
 * TypeScript note: JS regex needs the `m` flag for `^` to mean "start of line"
 * rather than "start of string". You will want both `g` and `m` here.
 * ─────────────────────────────────────────────────────────────────────────
 */

import type { Detector, DetectorName, Signal } from "../types";

export class DelimiterInjection implements Detector {
  readonly name: DetectorName = "DelimiterInjection";

  scan(text: string): Signal[] {
    if (!text) return [];
    // TODO(jasper): implement. See instructionOverride.ts for the shape.
    return [];
  }
}
