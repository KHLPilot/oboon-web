#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from rule_engine import RuleEngine


def parse_json_array(raw_value: str, arg_name: str) -> list[str]:
    try:
        value = json.loads(raw_value)
    except json.JSONDecodeError as exc:
        raise ValueError(f"{arg_name} must be a JSON array.") from exc
    if not isinstance(value, list):
        raise ValueError(f"{arg_name} must be a JSON array.")
    return [str(item) for item in value]


def build_reminder_message(missing_items: list[str]) -> str:
    if not missing_items:
        return ""
    item_blob = "; ".join(missing_items)
    return f"Please review these quality gaps before final output: {item_blob}"


def run_post_hook(
    result_text: str,
    changed_files: list[str],
    selected_manuals: list[str],
    skill_root: Path | None = None,
    workspace_root: Path | None = None,
    rules_path: Path | None = None,
) -> dict[str, Any]:
    skill_root = Path(skill_root or Path(__file__).resolve().parents[1])
    workspace_root = Path(workspace_root or Path.cwd())
    rules_path = Path(rules_path or skill_root / "config" / "rules.yaml")

    engine = RuleEngine(config_path=rules_path, workspace_root=workspace_root)
    evaluation = engine.evaluate_post(
        result_text=result_text,
        changed_files=changed_files,
        selected_manuals=selected_manuals,
    )
    reminder = build_reminder_message(evaluation["missing_items"])

    return {
        "checks": evaluation["checks"],
        "missing_items": evaluation["missing_items"],
        "reminder_message": reminder,
        "pass": evaluation["pass"],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Post-task quality hook")
    parser.add_argument("--result", required=True, help="Task result summary text")
    parser.add_argument(
        "--changed-files", required=True, help="JSON array of changed file paths"
    )
    parser.add_argument(
        "--selected-manuals", required=True, help="JSON array of selected manual IDs"
    )
    parser.add_argument("--rules-path", default=None, help="Path to rules file")
    parser.add_argument("--workspace-root", default=None, help="Workspace root path")
    args = parser.parse_args()

    try:
        changed_files = parse_json_array(args.changed_files, "--changed-files")
        selected_manuals = parse_json_array(args.selected_manuals, "--selected-manuals")
        result = run_post_hook(
            result_text=args.result,
            changed_files=changed_files,
            selected_manuals=selected_manuals,
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
