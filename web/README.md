# Prompt Sentinel — web demo

**Live at [prompt-sentinel-five.vercel.app](https://prompt-sentinel-five.vercel.app)**

A browser demo of the guard. Paste a prompt, see the verdict, the score, and the exact evidence
each detector matched.

**Everything runs client-side.** There is no API route and no server component doing the scanning,
so nothing you type leaves the browser. The build output is fully static, which is what makes that
claim checkable rather than a promise.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # vitest
npm run build    # static export
```

## Why a TypeScript port instead of calling the Python

Calling the Python guard from the browser would mean a server, a round trip, and sending user text
somewhere. A parallel TypeScript implementation keeps the demo instant, free to host, and private.

The obvious risk is two implementations drifting apart. `tests/parity.test.ts` closes that: it runs
the **same** `corpus.jsonl` and `heldout.jsonl` the Python harness uses through the TypeScript port
and asserts the metrics match. Duplication becomes verified parity, checked in CI.

All five detectors are implemented and **parity currently passes on both corpora**: the port
reproduces Python's 1.000 F1 on the development set and 0.350 recall on the held-out set exactly.

## Layout

```text
src/lib/sentinel/     the port: types, normalization, scoring, detectors
src/components/       VerdictPanel, HighlightedText
src/app/page.tsx      the demo
tests/                vitest, including cross-language parity
```

## Status

All five detectors are ported and passing: `InstructionOverride`, `RoleplayJailbreak`,
`DelimiterInjection`, `EncodingObfuscation`, `SystemPromptExfil`.

`npm test` runs 74 tests, including the cross-language parity checks.

Each detector has a test suite describing exactly what it must catch and, more importantly, what it
must *not* catch. The benign cases are the interesting ones: `The system: a distributed queue`,
`act as a proofreader`, and a base64 avatar all have to come back clean.
