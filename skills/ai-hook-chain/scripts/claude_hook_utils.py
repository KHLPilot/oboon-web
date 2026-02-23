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


def read_event() -> dict[str, Any]:
    raw = sys.stdin.read().strip()
    if not raw:
        return {}
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        return {"raw_event": raw}
    if isinstance(payload, dict):
        return payload
    return {"raw_event": payload}


def _extract_first(data: dict[str, Any], keys: list[str], default: str = "") -> str:
    for key in keys:
        value = data.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return default


def _extract_nested(data: dict[str, Any], parent_key: str, keys: list[str], default: str = "") -> str:
    parent = data.get(parent_key)
    if not isinstance(parent, dict):
        return default
    return _extract_first(parent, keys, default)


def sanitize_task_id(raw_id: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9._-]+", "_", raw_id.strip())
    return cleaned or "default-task"


def task_id_from_event(event: dict[str, Any]) -> str:
    value = _extract_first(
        event,
        ["task_id", "session_id", "conversation_id", "thread_id", "id"],
    )
    if not value:
        value = _extract_nested(event, "session", ["id"], default="")
    return sanitize_task_id(value or "default-task")


def workspace_root_from_event(event: dict[str, Any]) -> Path:
    cwd = _extract_first(event, ["cwd", "workspace", "workspace_root"], default="")
    return Path(cwd) if cwd else Path.cwd()


def request_text_from_event(event: dict[str, Any]) -> str:
    value = _extract_first(
        event,
        ["request", "prompt", "user_prompt", "input", "message", "text"],
        default="",
    )
    if not value:
        value = _extract_nested(event, "payload", ["prompt", "request", "text"], default="")
    return value


def result_text_from_event(event: dict[str, Any]) -> str:
    value = _extract_first(
        event,
        ["result", "response", "assistant_response", "output", "final_response", "text"],
        default="",
    )
    if not value:
        value = _extract_nested(
            event,
            "payload",
            ["result", "response", "assistant_response", "output", "text"],
            default="",
        )
    if not value:
        value = "Completed: assistant response finalized.\nDecision: follow project rules.\nNext: run validation."
    return value


def _string_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item) for item in value if str(item).strip()]
    if isinstance(value, str) and value.strip():
        return [value.strip()]
    return []


def changed_files_from_event(event: dict[str, Any]) -> list[str]:
    files: list[str] = []
    for key in ("changed_files", "files", "paths"):
        files.extend(_string_list(event.get(key)))

    for key in ("file_path", "path", "target_file"):
        value = event.get(key)
        if isinstance(value, str) and value.strip():
            files.append(value.strip())

    tool_input = event.get("tool_input") or event.get("input") or event.get("arguments")
    if isinstance(tool_input, str):
        try:
            tool_input = json.loads(tool_input)
        except json.JSONDecodeError:
            tool_input = {}

    if isinstance(tool_input, dict):
        for key in ("file_path", "path", "target_file"):
            value = tool_input.get(key)
            if isinstance(value, str) and value.strip():
                files.append(value.strip())
        for key in ("files", "paths"):
            files.extend(_string_list(tool_input.get(key)))
        edits = tool_input.get("edits")
        if isinstance(edits, list):
            for edit in edits:
                if not isinstance(edit, dict):
                    continue
                for key in ("file_path", "path", "target_file"):
                    value = edit.get(key)
                    if isinstance(value, str) and value.strip():
                        files.append(value.strip())

    normalized = [Path(value).as_posix() for value in files]
    return list(dict.fromkeys(normalized))


def completed_items_from_event(event: dict[str, Any]) -> list[str]:
    return _string_list(event.get("completed_items"))


def new_items_from_event(event: dict[str, Any]) -> list[str]:
    return _string_list(event.get("new_items"))


def append_chain_log(workspace_root: Path, task_id: str, phase: str, payload: dict[str, Any]) -> None:
    log_dir = workspace_root / ".ai-chain" / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    safe_task_id = sanitize_task_id(task_id)
    log_path = log_dir / f"{safe_task_id}.jsonl"
    record = {
        "at": now_iso(),
        "phase": phase,
        "payload": payload,
    }
    with log_path.open("a", encoding="utf-8") as file:
        file.write(json.dumps(record, ensure_ascii=False) + "\n")
