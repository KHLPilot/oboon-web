#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path

from claude_hook_utils import (
    append_chain_log,
    changed_files_from_event,
    completed_items_from_event,
    new_items_from_event,
    read_event,
    result_text_from_event,
    task_id_from_event,
    workspace_root_from_event,
)
from run_chain import HookChain


def main() -> int:
    event = read_event()
    workspace_root = workspace_root_from_event(event)
    task_id = task_id_from_event(event)
    result_text = result_text_from_event(event)
    changed_files = changed_files_from_event(event)
    completed_items = completed_items_from_event(event)
    new_items = new_items_from_event(event)

    chain_root = Path(__file__).resolve().parents[1]
    try:
        chain = HookChain(chain_skill_root=chain_root, workspace_root=workspace_root)
        payload = chain.run_post(
            task_id=task_id,
            result_text=result_text,
            changed_files=changed_files,
            completed_items=completed_items,
            new_items=new_items,
            selected_manuals_override=[],
        )
        append_chain_log(workspace_root, task_id, "post", payload)
    except Exception as exc:  # noqa: BLE001
        payload = {
            "task_id": task_id,
            "phase": "post",
            "error": str(exc),
        }
        append_chain_log(workspace_root, task_id, "post_error", payload)
        print(json.dumps(payload, ensure_ascii=False))
        return 1

    minimal = {
        "task_id": task_id,
        "phase": "post",
        "status": payload.get("status", "unknown"),
        "action": payload.get("action", "fix_now"),
        "needs_attention": payload.get("needs_attention", False),
    }
    print(json.dumps(minimal, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
