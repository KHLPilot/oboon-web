#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path

from claude_hook_utils import (
    append_chain_log,
    changed_files_from_event,
    read_event,
    task_id_from_event,
    workspace_root_from_event,
)


def main() -> int:
    event = read_event()
    workspace_root = workspace_root_from_event(event)
    task_id = task_id_from_event(event)
    changed_files = changed_files_from_event(event)
    tool_name = str(event.get("tool_name") or event.get("tool") or "tool").strip()

    chain_root = Path(__file__).resolve().parents[1]
    skills_root = chain_root.parent
    auto_quality_root = skills_root / "ai-auto-quality"
    scripts_dir = auto_quality_root / "scripts"
    if str(scripts_dir) not in sys.path:
        sys.path.insert(0, str(scripts_dir))

    try:
        from change_tracker import ChangeTracker, load_structured_file

        rules = load_structured_file(auto_quality_root / "config" / "quality_rules.yaml")
        tracker = ChangeTracker(workspace_root=workspace_root, rules=rules)
        tracker.start(task_id)
        if changed_files:
            snapshot = tracker.record(task_id, changed_files, event_type=f"tool:{tool_name}")
        else:
            snapshot = tracker.snapshot(task_id)
        payload = {
            "task_id": task_id,
            "phase": "record",
            "tool_name": tool_name,
            "recorded_files": changed_files,
            "touched_files_count": len(snapshot.get("touched_files", [])),
        }
        append_chain_log(workspace_root, task_id, "record", payload)
    except Exception as exc:  # noqa: BLE001
        payload = {
            "task_id": task_id,
            "phase": "record",
            "error": str(exc),
        }
        append_chain_log(workspace_root, task_id, "record_error", payload)
        print(json.dumps(payload, ensure_ascii=False))
        return 1

    print(json.dumps(payload, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
