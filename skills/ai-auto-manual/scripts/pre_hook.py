#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from manual_loader import ManualLoader
from rule_engine import RuleEngine


def parse_json_array(raw_value: str, arg_name: str) -> list[str]:
    try:
        value = json.loads(raw_value)
    except json.JSONDecodeError as exc:
        raise ValueError(f"{arg_name} must be a JSON array.") from exc
    if not isinstance(value, list):
        raise ValueError(f"{arg_name} must be a JSON array.")
    return [str(item) for item in value]


def run_pre_hook(
    request_text: str,
    changed_files: list[str],
    skill_root: Path | None = None,
    workspace_root: Path | None = None,
    rules_path: Path | None = None,
) -> dict[str, Any]:
    skill_root = Path(skill_root or Path(__file__).resolve().parents[1])
    workspace_root = Path(workspace_root or Path.cwd())
    rules_path = Path(rules_path or skill_root / "config" / "rules.yaml")

    engine = RuleEngine(config_path=rules_path, workspace_root=workspace_root)
    analysis = engine.analyze_pre(request_text=request_text, changed_files=changed_files)
    loader = ManualLoader(skill_root=skill_root)
    index_text = loader.load_index()
    selected_chapters = loader.load_chapters(
        manual_ids=analysis["selected_manuals"], manual_catalog=engine.manual_catalog()
    )
    summary = loader.build_summary(
        index_text=index_text,
        selected_manuals=analysis["selected_manuals"],
        manual_catalog=engine.manual_catalog(),
    )

    order = ["manuals/index.md"]
    order.extend(
        chapter["path"]
        for manual_id, chapter in selected_chapters.items()
        if manual_id in analysis["selected_manuals"]
    )

    return {
        "selected_manuals": analysis["selected_manuals"],
        "reasons": analysis["reasons"],
        "summary": summary,
        "required_reading": {
            "enforced": True,
            "order": order,
            "index": index_text,
            "chapters": {
                manual_id: chapter["content"]
                for manual_id, chapter in selected_chapters.items()
            },
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Pre-task manual selection hook")
    parser.add_argument("--request", required=True, help="User request text")
    parser.add_argument(
        "--changed-files", required=True, help="JSON array of changed file paths"
    )
    parser.add_argument("--rules-path", default=None, help="Path to rules file")
    parser.add_argument("--workspace-root", default=None, help="Workspace root path")
    args = parser.parse_args()

    try:
        changed_files = parse_json_array(args.changed_files, "--changed-files")
        result = run_pre_hook(
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
