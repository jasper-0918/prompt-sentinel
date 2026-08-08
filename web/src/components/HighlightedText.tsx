"use client";

import type { Signal } from "@/lib/sentinel";

/**
 * Renders the input with each matched span marked in place.
 *
 * Signals from normalized variants have a null span, because offsets computed
 * against folded text do not map onto what the user typed. Those are shown in
 * the reason list instead of highlighted here, rather than guessed at.
 */
export function HighlightedText({
  text,
  signals,
}: {
  text: string;
  signals: readonly Signal[];
}) {
  const spans = signals
    .map((s) => s.span)
    .filter((s): s is readonly [number, number] => s !== null)
    .sort((a, b) => a[0] - b[0]);

  // Merge overlapping spans so nested matches do not double-wrap.
  const merged: Array<[number, number]> = [];
  for (const [start, end] of spans) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }

  if (merged.length === 0) {
    return <span className="whitespace-pre-wrap break-words">{text}</span>;
  }

  const parts: React.ReactNode[] = [];
  let cursor = 0;
  merged.forEach(([start, end], i) => {
    if (cursor < start) parts.push(<span key={`t${i}`}>{text.slice(cursor, start)}</span>);
    parts.push(
      <mark
        key={`m${i}`}
        className="rounded bg-amber-200/70 px-0.5 text-neutral-900 dark:bg-amber-400/30 dark:text-amber-100"
      >
        {text.slice(start, end)}
      </mark>,
    );
    cursor = end;
  });
  if (cursor < text.length) parts.push(<span key="tail">{text.slice(cursor)}</span>);

  return <span className="whitespace-pre-wrap break-words">{parts}</span>;
}
