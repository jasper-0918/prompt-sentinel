"""Command-line interface.

    sentinel check "ignore previous instructions"
    sentinel scan prompts.txt
    sentinel eval

Exit codes: 0 = allowed, 1 = blocked (or eval ran), 2 = usage error.
"""

import argparse
import json
import sys
from dataclasses import asdict
from pathlib import Path

from sentinel.evaluation.runner import run_eval
from sentinel.sentinel import Sentinel
from sentinel.types import Verdict

# Corpora ship inside the package, so `sentinel eval` works from any install
# rather than only from a source checkout.
DATA_DIR = Path(__file__).resolve().parent / "data"
NAMED_DATASETS = {
    "corpus": DATA_DIR / "corpus.jsonl",
    "heldout": DATA_DIR / "heldout.jsonl",
}


def resolve_dataset(name: str) -> Path:
    """Resolve a dataset name ("corpus", "heldout") or a filesystem path."""
    if name in NAMED_DATASETS:
        return NAMED_DATASETS[name]
    return Path(name)


def _verdict_to_dict(verdict: Verdict) -> dict:
    return {
        "blocked": verdict.blocked,
        "score": round(verdict.score, 4),
        "error": verdict.error,
        "reasons": [asdict(signal) for signal in verdict.reasons],
    }


def _print_verdict(verdict: Verdict, as_json: bool) -> None:
    if as_json:
        print(json.dumps(_verdict_to_dict(verdict), indent=2))
        return

    status = "BLOCKED" if verdict.blocked else "ALLOWED"
    print(f"{status}  score={verdict.score:.3f}")
    if verdict.error:
        print(f"  ! degraded: {verdict.error}")
    for signal in verdict.reasons:
        print(f"  - [{signal.detector}] {signal.evidence!r} (w={signal.weight})")
    if not verdict.reasons and not verdict.error:
        print("  no signals")


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="sentinel",
        description="Explainable prompt-injection and jailbreak detection.",
    )
    parser.add_argument("--threshold", type=float, default=0.5, help="block threshold")
    sub = parser.add_subparsers(dest="command", required=True)

    check = sub.add_parser("check", help="check a single string")
    check.add_argument("text", help="text to check")
    check.add_argument("--json", action="store_true", help="emit JSON")

    scan = sub.add_parser("scan", help="check each line of a file")
    scan.add_argument("path", help="file to scan")
    scan.add_argument("--json", action="store_true", help="emit JSON")

    ev = sub.add_parser("eval", help="run the evaluation harness")
    ev.add_argument(
        "--dataset",
        default="corpus",
        help="'corpus' (development), 'heldout' (unseen), or a path to a JSONL file",
    )

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)
    guard = Sentinel(threshold=args.threshold)

    if args.command == "check":
        verdict = guard.check(args.text)
        _print_verdict(verdict, args.json)
        return 1 if verdict.blocked else 0

    if args.command == "scan":
        path = Path(args.path)
        if not path.exists():
            print(f"no such file: {path}", file=sys.stderr)
            return 2
        blocked_any = False
        results = []
        for lineno, line in enumerate(
            path.read_text(encoding="utf-8").splitlines(), start=1
        ):
            if not line.strip():
                continue
            verdict = guard.check(line)
            blocked_any = blocked_any or verdict.blocked
            if args.json:
                results.append({"line": lineno, **_verdict_to_dict(verdict)})
            elif verdict.blocked:
                print(f"line {lineno}: BLOCKED score={verdict.score:.3f}  {line[:60]!r}")
        if args.json:
            print(json.dumps(results, indent=2))
        return 1 if blocked_any else 0

    if args.command == "eval":
        corpus = resolve_dataset(args.dataset)
        if not corpus.exists():
            print(f"no such corpus: {corpus}", file=sys.stderr)
            return 2
        report = run_eval(guard, corpus)
        print(report.format())
        return 0

    return 2


if __name__ == "__main__":
    raise SystemExit(main())
