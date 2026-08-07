# Prompt Sentinel — Design Spec

**Date:** 2026-08-05
**Status:** Approved (design), pending implementation plan
**Author:** Jasper John Paitan, with Claude as tutor/pair

---

## 1. Purpose

A Python library and CLI that inspects text destined for an LLM and returns an **explainable
verdict** on whether it contains a prompt-injection or jailbreak attempt, plus a **red-team eval
harness** that measures the guard's own detection quality.

**Why this project, for Jasper specifically:**

- His public portfolio (agent-os, ai-dm-setter, job-ai-agent-free, RoScript-Pro, ai-document-organizer,
  arm-assembly-blink) contains **no security project**, despite security being half his stated career
  goal and the core of his "security-conscious AI engineer" positioning.
- Prompt injection is the #1 risk in the OWASP Top 10 for LLM Applications and an unsolved,
  actively-researched problem in 2026. Building a defense for it sits precisely on his
  security × AI moat.
- It is local-first, `$0`, and framework-free, consistent with his signature style.

**Learning goal (equal to the shipping goal):** he implements the detectors and scoring engine
himself against failing tests; the eval harness then *breaks* his detectors so he iterates. Claude
scaffolds and reviews adversarially but does not write the core logic for him.

## 2. Scope

### v1 (this spec)

Input guarding only: detect prompt-injection and jailbreak attempts in user-supplied text.

- Five heuristic detectors (below)
- A weighted scoring engine with a configurable threshold and policy
- Single entry point `Sentinel().check(text) -> Verdict`
- CLI: `check`, `scan`, `eval`
- Labeled corpus + eval harness reporting precision / recall / F1 / FPR / per-detector contribution
- Tests, CI, README with real benchmark numbers

### Explicitly out of scope for v1 (designed for, not built)

- **v2:** local-ML detector layer (HuggingFace classifier) as an additional `Detector`
- **v3:** LLM-as-judge detector layer
- **v4:** output guarding (PII / secret leakage in model responses), RAG-document poisoning scan,
  framework adapters (LangChain/FastAPI middleware)

The `Detector` interface is the extension point that makes each of these additive rather than a
rewrite. YAGNI applies: we do not build abstractions for v2–v4 beyond that one interface.

### Non-goals

- Not a WAF, not a general content moderator, not a toxicity classifier.
- Not a claim of completeness. Prompt injection is unsolved; the README will state plainly that this
  is defense-in-depth that raises attacker cost, never a guarantee. Overclaiming would be both
  dishonest and a credibility risk in an interview.

## 3. Architecture

```text
                    ┌──────────────┐
 text ─────────────►│  Detector A  │──┐
                    ├──────────────┤  │
                    │  Detector B  │──┼──► [Signal] ──► ScoringEngine ──► Verdict
                    ├──────────────┤  │                                   { blocked,
                    │     ...      │──┘                                     score,
                    └──────────────┘                                        reasons[] }
```

### Units and interfaces

Each unit has one purpose, a defined interface, and is independently testable.

**`types.py` — data contracts**

- `Signal{detector: str, weight: float, evidence: str, span: tuple[int,int] | None}`
  One piece of evidence from one detector. `evidence` is the matched text; `span` locates it.
- `Verdict{blocked: bool, score: float, reasons: list[Signal], error: str | None}`
  The output contract. Explainability is first-class: a caller can always answer "why?".
- Depends on: nothing (pure data).

**`detectors/base.py` — the `Detector` protocol**

- `name: str`
- `scan(text: str) -> list[Signal]`
- Pure, stateless, no I/O. This is the sole extension point for v2–v4 layers.

**`detectors/*.py` — the five v1 detectors** *(Jasper implements)*

| Detector | Catches | Example |
|----------|---------|---------|
| `InstructionOverride` | Attempts to countermand prior instructions | "ignore previous instructions", "disregard the above", "new instructions:" |
| `RoleplayJailbreak` | Persona/rule-suspension framing | DAN-style, "pretend you have no rules", "you are now..." |
| `DelimiterInjection` | Forged conversation structure | fake `system:` / `assistant:` turns, injected fences or XML tags |
| `EncodingObfuscation` | Smuggled payloads | base64 / hex / rot13, zero-width chars, homoglyphs |
| `SystemPromptExfil` | System-prompt extraction | "repeat the words above", "what are your instructions" |

**`scoring.py` — `ScoringEngine`**

- `aggregate(signals: list[Signal]) -> float` — weighted combination, saturating (many weak signals
  should not trivially exceed one strong signal; capped at 1.0).
- Threshold + policy applied here, both configurable.

**`sentinel.py` — `Sentinel` facade**

- `Sentinel(config).check(text) -> Verdict` — the one public entry point.
- Runs detectors, collects signals, delegates to `ScoringEngine`, builds `Verdict`.

**`cli.py`**

- `sentinel check "<text>"` — one-off verdict, human-readable or `--json`
- `sentinel scan <file>` — line/record-wise scan
- `sentinel eval [--dataset path]` — run the eval harness, print the report

**`eval/` — the red-team harness**

- `corpus.jsonl` — labeled records `{text, label: "attack"|"benign", family, source}`.
  Benign entries deliberately include **hard negatives**: legitimate text that superficially
  resembles attacks (e.g. a developer asking "how do I stop users from overriding my system
  prompt?"), because FPR on those is what separates a usable guard from an annoying one.
- `runner.py` — scores the guard across the corpus.
- Report: precision, recall, F1, false-positive rate, per-detector contribution, and the list of
  misses so failures are actionable.

### Data flow

1. Caller passes text to `Sentinel.check()`.
2. Each registered detector's `scan()` runs over the text, returning zero or more `Signal`s.
3. `ScoringEngine.aggregate()` combines signal weights into a score in `[0.0, 1.0]`.
4. `blocked = score >= threshold`; `Verdict` returned with all contributing signals as `reasons`.

## 4. Error handling

A guard that crashes its host application is worse than no guard, so `check()` must never propagate
a detector exception.

- Each detector runs inside a try/except. A failing detector is skipped, its failure recorded in
  `Verdict.error`, and processing continues with the remaining detectors.
- **Failure policy is explicit and configurable**, defaulting to **fail-closed**
  (`on_detector_error="suspicious"`): if the guard is degraded, treat input as suspicious. The
  alternative (`"allow"`) logs and permits. Making this a documented, deliberate choice rather than
  an emergent accident is itself part of the security design.
- Input limits: text over a configured max length is truncated for scanning (with a signal emitted),
  preventing pathological input from becoming a DoS vector.
- All regexes must be reviewed for catastrophic backtracking (ReDoS). A guard vulnerable to ReDoS is
  a self-inflicted availability bug; this is a review checklist item, not an afterthought.

## 5. Testing strategy

Tests are written **before** the implementation and serve as the behavior spec Jasper implements
against (test-driven, per his working style).

- **Unit tests per detector:** each detector gets known-positive and known-negative cases, including
  the hard negatives. A detector that fires on "please ignore the noise in this dataset" is broken.
- **Scoring tests:** saturation behavior, threshold boundaries, empty-signal case.
- **Facade tests:** `check()` contract, and that a deliberately-raising detector produces a
  degraded-but-non-crashing `Verdict` under both error policies.
- **Eval-harness tests:** metric math verified against a tiny hand-computed fixture, so the headline
  numbers cannot be silently wrong.
- **CI:** GitHub Actions running pytest on push.

Metrics claimed in the README must come from an actual `sentinel eval` run and be reproducible by
anyone cloning the repo. No asserted numbers that were not measured.

## 6. Repository and publishing

- **Local path:** `C:\Users\jaspe\Downloads\Personal\prompt-sentinel`
- **Layout:** `src/` layout, `pyproject.toml`, `pytest`, GitHub Actions CI.
- **Dependencies:** standard library only for the core guard where practical; the CLI may use a small
  arg-parsing dependency. No torch/transformers in v1. This keeps it installable anywhere and
  reinforces the framework-free stance.
- **README leads with:** the threat model, the measured benchmark numbers, a five-line usage example,
  and the honest limitations statement.
- **Publish flow (binding):** build locally → Jasper reviews the full diff → Jasper explicitly
  approves → only then `gh repo create` + push. Nothing reaches GitHub before that approval. Feature
  branch + PR discipline applies even though the repo is solo-authored.
- **Attribution:** commits authored as Jasper John Paitan <jasper.paitan0918@gmail.com>. Jasper is
  asked before any commit, per his standing rule.

## 7. Success criteria

1. `pip install -e .` then `Sentinel().check("ignore all previous instructions")` returns
   `blocked=True` with a populated, human-readable `reasons` list.
2. `sentinel eval` produces a metrics report from the bundled corpus.
3. All tests pass in CI.
4. Jasper can explain, unprompted, why each detector exists, how the scoring aggregates, and where
   the design is weak — because he wrote those parts.
5. The README's claims are measured, reproducible, and honestly bounded.

## 8. Known risks

- **Heuristics are bypassable by design.** Mitigated by framing (defense-in-depth, not a guarantee),
  by the eval harness making the bypass rate *visible and measurable*, and by the layered
  architecture that admits ML/LLM detectors in v2–v3.
- **False positives are the usability killer.** Mitigated by hard negatives in the corpus and by FPR
  being a headline metric rather than a footnote.
- **Scope creep toward v2–v4.** Mitigated by the explicit out-of-scope list above.
