#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def sanitize_task_id(raw: str) -> str:
    return re.sub(r"[^a-zA-Z0-9._-]+", "_", raw.strip()) or "default-task"


def normalize_payload(raw_json: str) -> dict[str, Any]:
    try:
        parsed = json.loads(raw_json)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid notify payload JSON: {exc}") from exc
    if not isinstance(parsed, dict):
        raise ValueError("Notify payload must be a JSON object.")
    return parsed


def workspace_from_payload(payload: dict[str, Any]) -> Path:
    cwd = payload.get("cwd")
    if isinstance(cwd, str) and cwd.strip():
        return Path(cwd.strip())
    return Path.cwd()


def task_id_from_payload(payload: dict[str, Any]) -> str:
    raw = str(payload.get("thread-id") or payload.get("thread_id") or "default-task")
    return sanitize_task_id(raw)


def append_log(workspace_root: Path, task_id: str, payload: dict[str, Any]) -> Path:
    log_dir = workspace_root / ".ai-chain" / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    log_path = log_dir / f"{task_id}.jsonl"
    entry = {
        "at": now_iso(),
        "phase": "codex-notify",
        "payload": payload,
    }
    with log_path.open("a", encoding="utf-8") as file:
        file.write(json.dumps(entry, ensure_ascii=False) + "\n")
    return log_path


def main() -> int:
    if len(sys.argv) < 2:
        print(json.dumps({"ok": False, "error": "notify payload argument is missing"}))
        return 2

    try:
        payload = normalize_payload(sys.argv[1])
        event_type = str(payload.get("type", "")).strip()
        if event_type != "agent-turn-complete":
            print(json.dumps({"ok": True, "skipped": True, "event_type": event_type}))
            return 0

        workspace_root = workspace_from_payload(payload)
        task_id = task_id_from_payload(payload)
        log_path = append_log(workspace_root, task_id, payload)
    except Exception as exc:  # noqa: BLE001
        print(json.dumps({"ok": False, "error": str(exc)}))
        return 1

    print(
        json.dumps(
            {
                "ok": True,
                "event_type": "agent-turn-complete",
                "task_id": task_id,
                "log_path": str(log_path),
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
