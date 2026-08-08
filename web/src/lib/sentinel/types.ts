/**
 * Data contracts for the guard.
 *
 * Mirrors `src/sentinel/types.py`. Explainability is a first-class output:
 * every Verdict carries the Signals that produced it, so the UI can always
 * show the user *why* something was flagged.
 */

/** The set of detectors that ship in v1. A union rather than `string` so a
 *  typo in a detector name is a compile error, not a runtime surprise. */
export type DetectorName =
  | "InstructionOverride"
  | "RoleplayJailbreak"
  | "DelimiterInjection"
  | "EncodingObfuscation"
  | "SystemPromptExfil";

/** One piece of evidence emitted by one detector. */
export interface Signal {
  /** Which detector fired. */
  readonly detector: DetectorName;
  /** Confidence in [0, 1]. Higher means more suspicious. */
  readonly weight: number;
  /** The matched substring, shown to the user. */
  readonly evidence: string;
  /**
   * Character offsets of the match in the *original* input, used to highlight
   * it in place. Null when the signal came from a normalized variant, whose
   * offsets do not map back onto what the user typed.
   */
  readonly span: readonly [number, number] | null;
}

/** The result of a guard check. */
export interface Verdict {
  /** True when the score met or exceeded the threshold. */
  readonly blocked: boolean;
  /** Aggregate suspicion score in [0, 1]. */
  readonly score: number;
  /** Every Signal that contributed. Empty means nothing fired. */
  readonly reasons: readonly Signal[];
  /** Set when a detector threw, so degraded results are visible. */
  readonly error: string | null;
}

/**
 * A stateless, pure text scanner.
 *
 * This is the sole extension point: a future ML or LLM-judge layer implements
 * this same interface without touching the scoring engine or the facade.
 */
export interface Detector {
  readonly name: DetectorName;
  scan(text: string): Signal[];
}

/** How the guard behaves when a detector throws. */
export type ErrorPolicy = "suspicious" | "allow";

export interface SentinelOptions {
  /** Score at or above which input is blocked. Defaults to 0.5. */
  readonly threshold?: number;
  /** Defaults to "suspicious" (fail-closed): a degraded guard should not
   *  quietly start permitting everything. */
  readonly onDetectorError?: ErrorPolicy;
  /** Input beyond this length is truncated before scanning. */
  readonly maxLength?: number;
  /** Whether to also scan normalized variants of the input. */
  readonly normalize?: boolean;
  /** Override the detector set, mainly for tests. */
  readonly detectors?: readonly Detector[];
}
