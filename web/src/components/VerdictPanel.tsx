"use client";

import { AlertTriangle, CheckCircle2, ShieldAlert, TriangleAlert } from "lucide-react";

import { HighlightedText } from "@/components/HighlightedText";
import type { Verdict } from "@/lib/sentinel";

function ScoreBar({ score, threshold }: { score: number; threshold: number }) {
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
      <div
        className={`h-full rounded-full transition-all duration-300 ${
          score >= threshold ? "bg-red-500" : "bg-emerald-500"
        }`}
        style={{ width: `${Math.round(score * 100)}%` }}
      />
      <div
        className="absolute top-0 h-full w-px bg-neutral-500 dark:bg-neutral-400"
        style={{ left: `${Math.round(threshold * 100)}%` }}
        aria-hidden
      />
    </div>
  );
}

export function VerdictPanel({
  text,
  verdict,
  threshold,
}: {
  text: string;
  verdict: Verdict;
  threshold: number;
}) {
  const { blocked, score, reasons, error } = verdict;
  const empty = text.trim().length === 0;

  return (
    <section
      aria-live="polite"
      className="flex flex-col gap-5 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950"
    >
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          {empty ? (
            <span className="text-sm text-neutral-500 dark:text-neutral-400">
              Awaiting input
            </span>
          ) : blocked ? (
            <>
              <ShieldAlert className="size-5 text-red-600 dark:text-red-400" aria-hidden />
              <span className="font-semibold text-red-600 dark:text-red-400">Blocked</span>
            </>
          ) : (
            <>
              <CheckCircle2
                className="size-5 text-emerald-600 dark:text-emerald-400"
                aria-hidden
              />
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                Allowed
              </span>
            </>
          )}
        </div>
        <div className="font-mono text-sm tabular-nums text-neutral-600 dark:text-neutral-400">
          {score.toFixed(3)}
          <span className="ml-1 text-neutral-400 dark:text-neutral-600">
            / {threshold.toFixed(2)}
          </span>
        </div>
      </header>

      <ScoreBar score={score} threshold={threshold} />

      {error && (
        <p className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>Degraded: {error}</span>
        </p>
      )}

      {!empty && (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 font-mono text-sm leading-relaxed text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200">
          <HighlightedText text={text} signals={reasons} />
        </div>
      )}

      <div>
        <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          {reasons.length === 0
            ? "Signals"
            : `Signals (${reasons.length})`}
        </h2>

        {reasons.length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {empty
              ? "Type something, or load an example."
              : "Nothing fired. No detector found evidence in this input."}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {reasons.map((signal, i) => (
              <li
                key={`${signal.detector}-${i}`}
                className="flex items-start gap-3 rounded-lg border border-neutral-200 p-3 transition-colors hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:border-neutral-700 dark:hover:bg-neutral-900"
              >
                <AlertTriangle
                  className="mt-0.5 size-4 shrink-0 text-amber-500"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {signal.detector}
                    </span>
                    <span className="font-mono text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                      w={signal.weight.toFixed(2)}
                    </span>
                  </div>
                  <p className="mt-1 break-words font-mono text-xs text-neutral-600 dark:text-neutral-400">
                    {signal.evidence}
                  </p>
                  {signal.span === null && (
                    <p className="mt-1 text-xs italic text-neutral-500 dark:text-neutral-500">
                      matched after normalization
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
