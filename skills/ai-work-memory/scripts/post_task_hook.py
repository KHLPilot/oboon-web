#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from memory_store import (
    MemoryRuleEngine,
    MemoryStore,
    extract_prefixed_items,
    load_structured_file,
)


def parse_json_array(value: str, arg_name: str) -> list[str]:
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError as exc:
        raise ValueError(f"{arg_name} must be a JSON array.") from exc
    if not isinstance(parsed, list):
        raise ValueError(f"{arg_name} must be a JSON array.")
    return [str(item) for item in parsed]


def run_post_task_hook(
    result_text: str,
    changed_files: list[str],
    completed_items: list[str],
    new_items: list[str],
    skill_root: Path | None = None,
    workspace_root: Path | None = None,
    rules_path: Path | None = None,
) -> dict[str, Any]:
    del changed_files

    skill_root = Path(skill_root or Path(__file__).resolve().parents[1])
    workspace_root = Path(workspace_root or Path.cwd())
    rules_path = Path(rules_path or skill_root / "config" / "memory_rules.yaml")

    rules = load_structured_file(rules_path)
    store = MemoryStore(skill_root=skill_root, workspace_root=workspace_root, rules=rules)
    engine = MemoryRuleEngine(rules=rules)
    created_documents = store.ensure_documents()
    docs = store.load_documents()

    extractors = rules.get("result_extractors", {})
    extracted_completed = extract_prefixed_items(
        result_text=result_text,
        prefixes=extractors.get("completed_prefixes", []),
    )
    extracted_decisions = extract_prefixed_items(
        result_text=result_text,
        prefixes=extractors.get("decision_prefixes", []),
    )
    extracted_next = extract_prefixed_items(
        result_text=result_text,
        prefixes=extractors.get("next_prefixes", []),
    )

    merged_completed = list(dict.fromkeys([*completed_items, *extracted_completed]))
    merged_next = list(dict.fromkeys([*new_items, *extracted_next]))

    max_in_progress = int(rules.get("limits", {}).get("max_in_progress", 2))
    updated_checklist, checklist_update = store.update_checklist(
        checklist_text=docs["checklist"],
        completed_items=merged_completed,
        new_items=merged_next,
        max_in_progress=max_in_progress,
    )
    updated_context = store.append_context_update(
        context_text=docs["context"],
        result_text=result_text,
        decisions=extracted_decisions,
        next_steps=merged_next,
    )

    store.save_documents({"checklist": updated_checklist, "context": updated_context})
    quality = engine.evaluate_result_quality(result_text=result_text)
    reminder_template = str(
        rules.get("messages", {}).get(
            "post_reminder_template", "Missing memory updates: {missing_items}"
        )
    )
    reminder_message = ""
    if quality["missing_items"]:
        reminder_message = reminder_template.format(
            missing_items="; ".join(quality["missing_items"])
        )

    return {
        "created_documents": created_documents,
        "completed_items": merged_completed,
        "next_items": merged_next,
        "decisions": extracted_decisions,
        "checklist_update": checklist_update,
        "checks": quality["checks"],
        "missing_items": quality["missing_items"],
        "reminder_message": reminder_message,
        "pass": quality["pass"],
        "updated_files": {
            "context": store.document_relative_paths()["context"],
            "checklist": store.document_relative_paths()["checklist"],
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Post-task hook for work-memory system")
    parser.add_argument("--result", required=True, help="Task result summary text")
    parser.add_argument("--changed-files", default="[]", help="JSON array of changed files")
    parser.add_argument("--completed-items", default="[]", help="JSON array of completed tasks")
    parser.add_argument("--new-items", default="[]", help="JSON array of new todo tasks")
    parser.add_argument("--rules-path", default=None, help="Memory rules file path")
    parser.add_argument("--workspace-root", default=None, help="Workspace root path")
    args = parser.parse_args()

    try:
        changed_files = parse_json_array(args.changed_files, "--changed-files")
        completed_items = parse_json_array(args.completed_items, "--completed-items")
        new_items = parse_json_array(args.new_items, "--new-items")
        result = run_post_task_hook(
            result_text=args.result,
            changed_files=changed_files,
            completed_items=completed_items,
            new_items=new_items,
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
