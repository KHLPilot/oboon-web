#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def load_structured_file(path: Path) -> dict[str, Any]:
    raw = path.read_text(encoding="utf-8")
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        try:
            import yaml  # type: ignore
        except ModuleNotFoundError as exc:
            raise RuntimeError(
                "Config is not valid JSON and PyYAML is unavailable."
            ) from exc
        parsed = yaml.safe_load(raw)
    if not isinstance(parsed, dict):
        raise RuntimeError("Config root must be an object.")
    return parsed


def parse_json_array(raw: str, arg_name: str) -> list[str]:
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError(f"{arg_name} must be a JSON array.") from exc
    if not isinstance(parsed, list):
        raise ValueError(f"{arg_name} must be a JSON array.")
    return [str(item) for item in parsed]


class ChangeTracker:
    def __init__(self, workspace_root: Path, rules: dict[str, Any]) -> None:
        storage = rules.get("storage", {})
        session_dir_rel = storage.get("session_dir", ".ai-quality/sessions")
        self.workspace_root = Path(workspace_root)
        self.session_dir = self.workspace_root / Path(session_dir_rel)
        self.session_dir.mkdir(parents=True, exist_ok=True)

    def start(self, task_id: str) -> dict[str, Any]:
        current = self._load_or_default(task_id)
        if "started_at" not in current:
            current["started_at"] = now_iso()
        current["updated_at"] = now_iso()
        current.setdefault("events", [])
        current.setdefault("touched_files", [])
        self._save(task_id, current)
        return current

    def record(self, task_id: str, changed_files: list[str], event_type: str = "edit") -> dict[str, Any]:
        current = self._load_or_default(task_id)
        normalized = [self._normalize_path(file_path) for file_path in changed_files]
        normalized = [value for value in normalized if value]
        current.setdefault("events", [])
        current.setdefault("touched_files", [])
        known = set(current["touched_files"])
        for file_path in normalized:
            if file_path not in known:
                current["touched_files"].append(file_path)
                known.add(file_path)

        if normalized:
            current["events"].append(
                {
                    "at": now_iso(),
                    "type": event_type,
                    "files": normalized,
                }
            )
        current["updated_at"] = now_iso()
        self._save(task_id, current)
        return current

    def snapshot(self, task_id: str) -> dict[str, Any]:
        return self._load_or_default(task_id)

    def end(self, task_id: str) -> dict[str, Any]:
        current = self._load_or_default(task_id)
        current["ended_at"] = now_iso()
        current["updated_at"] = now_iso()
        self._save(task_id, current)
        return current

    def _session_path(self, task_id: str) -> Path:
        safe_task_id = re.sub(r"[^a-zA-Z0-9._-]+", "_", task_id.strip()) or "default"
        return self.session_dir / f"{safe_task_id}.json"

    def _load_or_default(self, task_id: str) -> dict[str, Any]:
        path = self._session_path(task_id)
        if path.exists():
            loaded = json.loads(path.read_text(encoding="utf-8"))
            if not isinstance(loaded, dict):
                raise RuntimeError("Session file must contain an object.")
            return loaded
        return {
            "task_id": task_id,
            "started_at": now_iso(),
            "updated_at": now_iso(),
            "events": [],
            "touched_files": [],
        }

    def _save(self, task_id: str, payload: dict[str, Any]) -> None:
        path = self._session_path(task_id)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    def _normalize_path(self, path_value: str) -> str:
        candidate = Path(path_value)
        if candidate.is_absolute():
            try:
                return candidate.relative_to(self.workspace_root).as_posix()
            except ValueError:
                return candidate.as_posix()
        return candidate.as_posix()


def main() -> int:
    parser = argparse.ArgumentParser(description="Track touched files for quality checks")
    parser.add_argument("--task-id", required=True, help="Task session ID")
    parser.add_argument(
        "--mode",
        required=True,
        choices=["start", "record", "snapshot", "end"],
        help="Tracker mode",
    )
    parser.add_argument("--changed-files", default="[]", help="JSON array of changed files")
    parser.add_argument("--rules-path", default=None, help="Rules file path")
    parser.add_argument("--workspace-root", default=None, help="Workspace root path")
    args = parser.parse_args()

    skill_root = Path(__file__).resolve().parents[1]
    rules_path = Path(args.rules_path) if args.rules_path else skill_root / "config" / "quality_rules.yaml"
    workspace_root = Path(args.workspace_root) if args.workspace_root else Path.cwd()

    try:
        rules = load_structured_file(rules_path)
        tracker = ChangeTracker(workspace_root=workspace_root, rules=rules)
        if args.mode == "start":
            payload = tracker.start(args.task_id)
        elif args.mode == "record":
            changed = parse_json_array(args.changed_files, "--changed-files")
            payload = tracker.record(args.task_id, changed)
        elif args.mode == "snapshot":
            payload = tracker.snapshot(args.task_id)
        elif args.mode == "end":
            payload = tracker.end(args.task_id)
        else:
            raise RuntimeError(f"Unsupported mode: {args.mode}")
    except ValueError as exc:
        print(json.dumps({"error": str(exc)}))
        return 2
    except Exception as exc:  # noqa: BLE001
        print(json.dumps({"error": str(exc)}))
        return 1

    print(json.dumps(payload, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
