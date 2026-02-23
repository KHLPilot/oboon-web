#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path

from claude_hook_utils import (
    append_chain_log,
    changed_files_from_event,
    read_event,
    request_text_from_event,
    task_id_from_event,
    workspace_root_from_event,
)
from run_chain import HookChain


def main() -> int:
    event = read_event()
    workspace_root = workspace_root_from_event(event)
    task_id = task_id_from_event(event)
    request_text = request_text_from_event(event)
    changed_files = changed_files_from_event(event)

    chain_root = Path(__file__).resolve().parents[1]
    try:
        chain = HookChain(chain_skill_root=chain_root, workspace_root=workspace_root)
        payload = chain.run_pre(
            task_id=task_id,
            request_text=request_text,
            changed_files=changed_files,
        )
        append_chain_log(workspace_root, task_id, "pre", payload)
    except Exception as exc:  # noqa: BLE001
        payload = {
            "task_id": task_id,
            "phase": "pre",
            "error": str(exc),
        }
        append_chain_log(workspace_root, task_id, "pre_error", payload)
        print(json.dumps(payload, ensure_ascii=False))
        return 1

    minimal = {
        "task_id": task_id,
        "phase": "pre",
        "should_block": payload.get("should_block", False),
        "block_reasons": payload.get("block_reasons", []),
        "selected_manuals": payload.get("selected_manuals", []),
    }
    print(json.dumps(minimal, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
