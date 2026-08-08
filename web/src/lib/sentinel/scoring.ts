/**
 * Signal aggregation. Mirrors `src/sentinel/scoring.py`.
 *
 * The combination rule must satisfy three constraints that pull against each
 * other:
 *
 *   1. The score never exceeds 1.
 *   2. Several weak signals must not outrank one strong signal.
 *   3. More corroborating evidence must still raise the score.
 *
 * Summation breaks (1) and (2); `Math.max` breaks (3). Noisy-OR satisfies all
 * three: the probability that at least one independent signal is a true
 * positive.
 *
 *   score = 1 - Π(1 - w)
 */

import type { Signal } from "./types";

const clamp01 = (n: number): number => Math.min(Math.max(n, 0), 1);

export class ScoringEngine {
  readonly threshold: number;

  constructor(threshold = 0.5) {
    if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
      throw new RangeError(`threshold must be in [0, 1], got ${threshold}`);
    }
    this.threshold = threshold;
  }

  /** Combine signal weights via noisy-OR into a score in [0, 1]. */
  aggregate(signals: readonly Signal[]): number {
    let remaining = 1;
    for (const signal of signals) {
      remaining *= 1 - clamp01(signal.weight);
    }
    // Clamp again to absorb floating-point drift so the contract holds exactly.
    return clamp01(1 - remaining);
  }

  /** True when the score meets or exceeds the configured threshold. */
  isBlocked(score: number): boolean {
    return score >= this.threshold;
  }
}
