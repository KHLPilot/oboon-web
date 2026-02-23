#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from memory_store import MemoryRuleEngine, MemoryStore, load_structured_file


def parse_json_array(value: str, arg_name: str) -> list[str]:
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError as exc:
        raise ValueError(f"{arg_name} must be a JSON array.") from exc
    if not isinstance(parsed, list):
        raise ValueError(f"{arg_name} must be a JSON array.")
    return [str(item) for item in parsed]


def run_pre_plan_hook(
    request_text: str,
    changed_files: list[str],
    skill_root: Path | None = None,
    workspace_root: Path | None = None,
    rules_path: Path | None = None,
) -> dict[str, Any]:
    skill_root = Path(skill_root or Path(__file__).resolve().parents[1])
    workspace_root = Path(workspace_root or Path.cwd())
    rules_path = Path(rules_path or skill_root / "config" / "memory_rules.yaml")

    rules = load_structured_file(rules_path)
    store = MemoryStore(skill_root=skill_root, workspace_root=workspace_root, rules=rules)
    engine = MemoryRuleEngine(rules=rules)
    analysis = engine.detect_large_task(request_text=request_text, changed_files=changed_files)

    created_documents: list[str] = []
    docs: dict[str, str] = {}
    should_block = False
    message = ""

    if analysis["is_large_task"]:
        created_documents = store.ensure_documents()
        docs = store.load_documents()
        should_block = True
        message = str(rules.get("messages", {}).get("plan_gate", "Plan review is required."))

    return {
        "is_large_task": analysis["is_large_task"],
        "score": analysis["score"],
        "threshold": analysis["threshold"],
        "reasons": analysis["reasons"],
        "should_block": should_block,
        "message": message,
        "created_documents": created_documents,
        "memory_files": store.document_relative_paths(),
        "required_reading": {
            "order": [
                store.document_relative_paths()["plan"],
                store.document_relative_paths()["context"],
                store.document_relative_paths()["checklist"],
            ],
            "documents": docs,
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Pre-plan hook for work-memory system")
    parser.add_argument("--request", required=True, help="User request text")
    parser.add_argument("--changed-files", default="[]", help="JSON array of changed files")
    parser.add_argument("--rules-path", default=None, help="Memory rules file path")
    parser.add_argument("--workspace-root", default=None, help="Workspace root path")
    args = parser.parse_args()

    try:
        changed_files = parse_json_array(args.changed_files, "--changed-files")
        result = run_pre_plan_hook(
            request_text=args.request,
            changed_files=changed_files,
            rules_path=Path(args.rules_path) if args.rules_path else None,
            workspace_root=Path(args.workspace_root) if args.workspace_root else None,
        )
    except ValueError as exc:
        print(json.dumps({"error": str(exc)}))
        return 2
    except Exception as exc:  # noqa: BLE001
        print(json.dumps({"error": str(exc)}))
        return 1

    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
