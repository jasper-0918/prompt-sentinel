/**
 * Prompt Sentinel, TypeScript port.
 *
 * A parallel implementation of the Python guard that runs in the browser, so
 * the demo never sends user text to a server. Parity with Python is enforced
 * by `tests/parity.test.ts`, which runs the same corpus through both and
 * asserts the same metrics.
 */

export { Sentinel, defaultDetectors } from "./sentinel";
export { ScoringEngine } from "./scoring";
export { normalize, variants } from "./normalization";
export { InstructionOverride } from "./detectors/instructionOverride";
export { RoleplayJailbreak } from "./detectors/roleplayJailbreak";
export { DelimiterInjection } from "./detectors/delimiterInjection";
export { EncodingObfuscation } from "./detectors/encodingObfuscation";
export { SystemPromptExfil } from "./detectors/systemPromptExfil";
export type {
  Detector,
  DetectorName,
  ErrorPolicy,
  SentinelOptions,
  Signal,
  Verdict,
} from "./types";
