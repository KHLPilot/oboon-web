#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from memory_store import MemoryStore, load_structured_file


def parse_json_array(value: str, arg_name: str) -> list[str]:
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError as exc:
        raise ValueError(f"{arg_name} must be a JSON array.") from exc
    if not isinstance(parsed, list):
        raise ValueError(f"{arg_name} must be a JSON array.")
    return [str(item) for item in parsed]


def run_pre_task_hook(
    request_text: str,
    changed_files: list[str],
    skill_root: Path | None = None,
    workspace_root: Path | None = None,
    rules_path: Path | None = None,
) -> dict[str, Any]:
    del request_text, changed_files

    skill_root = Path(skill_root or Path(__file__).resolve().parents[1])
    workspace_root = Path(workspace_root or Path.cwd())
    rules_path = Path(rules_path or skill_root / "config" / "memory_rules.yaml")

    rules = load_structured_file(rules_path)
    store = MemoryStore(skill_root=skill_root, workspace_root=workspace_root, rules=rules)
    created_documents = store.ensure_documents()
    docs = store.load_documents()
    plan_status = store.parse_plan_status(docs["plan"])
    required_status = store.required_plan_status()

    entries = store.parse_checklist(docs["checklist"])
    stats = store.checklist_stats(entries)
    max_in_progress = int(rules.get("limits", {}).get("max_in_progress", 2))
    slots = max(0, max_in_progress - stats["in_progress"])
    next_tasks = store.suggest_next_tasks(entries=entries, slots=slots)

    messages: list[str] = []
    should_block = False
    if plan_status != required_status:
        should_block = True
        messages.append(
            str(
                rules.get("messages", {}).get(
                    "approval_gate", "Plan is not approved yet."
                )
            )
        )
    if stats["in_progress"] > max_in_progress:
        should_block = True
        messages.append(
            str(
                rules.get("messages", {}).get(
                    "in_progress_limit", "In-progress task limit exceeded."
                )
            )
        )

    return {
        "should_block": should_block,
        "messages": messages,
        "created_documents": created_documents,
        "plan_status": plan_status,
        "required_status": required_status,
        "checklist_stats": stats,
        "max_in_progress": max_in_progress,
        "next_tasks": next_tasks,
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
    parser = argparse.ArgumentParser(description="Pre-task hook for work-memory system")
    parser.add_argument("--request", default="", help="User request text")
    parser.add_argument("--changed-files", default="[]", help="JSON array of changed files")
    parser.add_argument("--rules-path", default=None, help="Memory rules file path")
    parser.add_argument("--workspace-root", default=None, help="Workspace root path")
    args = parser.parse_args()

    try:
        changed_files = parse_json_array(args.changed_files, "--changed-files")
        result = run_pre_task_hook(
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
