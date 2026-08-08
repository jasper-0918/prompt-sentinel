"use client";

import { useMemo, useState } from "react";
import { Code2, Lock, RotateCcw } from "lucide-react";

import { VerdictPanel } from "@/components/VerdictPanel";
import { Sentinel } from "@/lib/sentinel";
import { PRESETS } from "@/lib/presets";

const REPO_URL = "https://github.com/jasper-0918/prompt-sentinel";

export default function Home() {
  const [text, setText] = useState("");
  const [threshold, setThreshold] = useState(0.5);

  // The guard is stateless, so it is rebuilt only when the threshold changes.
  const guard = useMemo(() => new Sentinel({ threshold }), [threshold]);
  const verdict = useMemo(() => guard.check(text), [guard, text]);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-5 py-10 sm:px-8">
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
              Prompt Sentinel
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              Explainable prompt-injection and jailbreak detection. Type below and see the
              verdict, the score, and exactly which detectors fired and why.
            </p>
          </div>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="flex shrink-0 items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-700 dark:hover:bg-neutral-900"
          >
            <Code2 className="size-4" aria-hidden />
            Source
          </a>
        </div>

        <p className="flex items-center gap-2 self-start rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
          <Lock className="size-3.5" aria-hidden />
          Runs entirely in your browser. Nothing you type is sent anywhere.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label
            htmlFor="input"
            className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400"
          >
            Input
          </label>
          {text && (
            <button
              type="button"
              onClick={() => setText("")}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            >
              <RotateCcw className="size-3.5" aria-hidden />
              Clear
            </button>
          )}
        </div>

        <textarea
          id="input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          spellCheck={false}
          placeholder="Paste a prompt, or load an example below."
          className="w-full resize-y rounded-xl border border-neutral-200 bg-white p-4 font-mono text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 hover:border-neutral-300 focus:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100 dark:placeholder:text-neutral-600 dark:hover:border-neutral-700 dark:focus:border-neutral-600"
        />

        <div className="flex flex-wrap items-center gap-3">
          <label
            htmlFor="threshold"
            className="text-xs font-medium text-neutral-600 dark:text-neutral-400"
          >
            Threshold
          </label>
          <input
            id="threshold"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="h-1 w-48 cursor-pointer appearance-none rounded-full bg-neutral-200 accent-neutral-900 transition-colors hover:bg-neutral-300 dark:bg-neutral-800 dark:accent-neutral-100 dark:hover:bg-neutral-700"
          />
          <span className="font-mono text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
            {threshold.toFixed(2)}
          </span>
          <span className="text-xs text-neutral-500 dark:text-neutral-500">
            lower catches more, and flags more legitimate text
          </span>
        </div>
      </section>

      <VerdictPanel text={text} verdict={verdict} threshold={threshold} />

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          Examples
        </h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          The benign ones matter most. Each contains a word a naive keyword filter would
          trip on, and each should come back clean.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => setText(preset.text)}
              className="group flex flex-col gap-1 rounded-lg border border-neutral-200 p-3 text-left transition-colors hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:border-neutral-700 dark:hover:bg-neutral-900"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`size-1.5 shrink-0 rounded-full ${
                    preset.kind === "attack" ? "bg-red-500" : "bg-emerald-500"
                  }`}
                  aria-hidden
                />
                <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {preset.label}
                </span>
              </div>
              <span className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                {preset.note}
              </span>
            </button>
          ))}
        </div>
      </section>

      <footer className="mt-4 border-t border-neutral-200 pt-6 text-xs leading-relaxed text-neutral-500 dark:border-neutral-800 dark:text-neutral-500">
        <p className="max-w-3xl">
          This is defense in depth, not a guarantee. It raises the cost of an attack, it
          does not make an application safe. Detection is lexical, so paraphrase,
          non-English, and social-engineering attacks get through. Measured held-out recall
          is 0.35, and that number is published in the repository rather than hidden.
        </p>
      </footer>
    </main>
  );
}
