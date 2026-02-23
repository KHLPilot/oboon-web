#!/usr/bin/env python3
from __future__ import annotations

import argparse
import importlib.util
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from types import ModuleType
from typing import Any


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def parse_json_array(raw: str, arg_name: str) -> list[str]:
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError(f"{arg_name} must be a JSON array.") from exc
    if not isinstance(parsed, list):
        raise ValueError(f"{arg_name} must be a JSON array.")
    return [str(item) for item in parsed]


def load_module(module_name: str, file_path: Path) -> ModuleType:
    spec = importlib.util.spec_from_file_location(module_name, file_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load module from {file_path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


def ensure_on_syspath(path: Path) -> None:
    value = str(path.resolve())
    if value not in sys.path:
        sys.path.insert(0, value)


def get_nested_value(payload: dict[str, Any], dotted_key: str, default: Any = None) -> Any:
    current: Any = payload
    for key in dotted_key.split("."):
        if not isinstance(current, dict) or key not in current:
            return default
        current = current[key]
    return current


def _team_reminder(agent_team_post: dict[str, Any]) -> str:
    gate_status = str(get_nested_value(agent_team_post, "gate.status", "pass"))
    if gate_status == "pass":
        return ""
    reasons = get_nested_value(agent_team_post, "gate.reasons", []) or []
    if isinstance(reasons, list):
        reason_text = "; ".join(str(item) for item in reasons if str(item).strip())
    else:
        reason_text = str(reasons)
    return f"Agent team review requested follow-up: {reason_text}".strip()


class HookChain:
    def __init__(self, chain_skill_root: Path, workspace_root: Path) -> None:
        self.chain_skill_root = Path(chain_skill_root)
        self.workspace_root = Path(workspace_root)
        self.skills_root = self.chain_skill_root.parent
        self.work_memory_root = self.skills_root / "ai-work-memory"
        self.auto_manual_root = self.skills_root / "ai-auto-manual"
        self.auto_quality_root = self.skills_root / "ai-auto-quality"
        self.agent_team_root = self.skills_root / "ai-agent-team"
        self.session_root = self.workspace_root / ".ai-chain" / "sessions"
        self.session_root.mkdir(parents=True, exist_ok=True)

        ensure_on_syspath(self.work_memory_root / "scripts")
        ensure_on_syspath(self.auto_manual_root / "scripts")
        ensure_on_syspath(self.auto_quality_root / "scripts")
        ensure_on_syspath(self.agent_team_root / "scripts")

        self.work_memory_pre_plan = load_module(
            "wm_pre_plan_hook", self.work_memory_root / "scripts" / "pre_plan_hook.py"
        )
        self.work_memory_pre_task = load_module(
            "wm_pre_task_hook", self.work_memory_root / "scripts" / "pre_task_hook.py"
        )
        self.work_memory_post_task = load_module(
            "wm_post_task_hook", self.work_memory_root / "scripts" / "post_task_hook.py"
        )
        self.auto_manual_pre = load_module(
            "manual_pre_hook", self.auto_manual_root / "scripts" / "pre_hook.py"
        )
        self.auto_manual_post = load_module(
            "manual_post_hook", self.auto_manual_root / "scripts" / "post_hook.py"
        )
        self.auto_quality_post = load_module(
            "quality_post_hook", self.auto_quality_root / "scripts" / "post_quality_hook.py"
        )
        self.auto_quality_tracker = load_module(
            "quality_change_tracker", self.auto_quality_root / "scripts" / "change_tracker.py"
        )
        self.agent_team_pipeline = load_module(
            "agent_team_pipeline", self.agent_team_root / "scripts" / "run_agent_pipeline.py"
        )

    def run_pre(self, task_id: str, request_text: str, changed_files: list[str]) -> dict[str, Any]:
        rules = self.auto_quality_tracker.load_structured_file(
            self.auto_quality_root / "config" / "quality_rules.yaml"
        )
        tracker = self.auto_quality_tracker.ChangeTracker(
            workspace_root=self.workspace_root, rules=rules
        )
        tracker.start(task_id)
        if changed_files:
            tracker.record(task_id, changed_files, event_type="pre_chain_input")

        pre_plan = self.work_memory_pre_plan.run_pre_plan_hook(
            request_text=request_text,
            changed_files=changed_files,
            skill_root=self.work_memory_root,
            workspace_root=self.workspace_root,
        )
        pre_task = self.work_memory_pre_task.run_pre_task_hook(
            request_text=request_text,
            changed_files=changed_files,
            skill_root=self.work_memory_root,
            workspace_root=self.workspace_root,
        )
        manual_pre = self.auto_manual_pre.run_pre_hook(
            request_text=request_text,
            changed_files=changed_files,
            skill_root=self.auto_manual_root,
            workspace_root=self.workspace_root,
        )

        should_block = bool(pre_plan.get("should_block")) or bool(pre_task.get("should_block"))
        block_reasons = []
        if pre_plan.get("should_block") and pre_plan.get("message"):
            block_reasons.append(str(pre_plan["message"]))
        for message in pre_task.get("messages", []):
            block_reasons.append(str(message))
        block_reasons = list(dict.fromkeys(block_reasons))

        session_payload = {
            "task_id": task_id,
            "created_at": now_iso(),
            "updated_at": now_iso(),
            "request_text": request_text,
            "selected_manuals": manual_pre.get("selected_manuals", []),
            "memory_files": pre_task.get("memory_files", {}),
            "quality_session_started": True,
            "pre": {
                "work_memory_pre_plan": pre_plan,
                "work_memory_pre_task": pre_task,
                "auto_manual_pre": {
                    "selected_manuals": manual_pre.get("selected_manuals", []),
                    "summary": manual_pre.get("summary", ""),
                },
            },
        }
        self._save_session(task_id, session_payload)

        return {
            "task_id": task_id,
            "phase": "pre",
            "order": [
                "ai-work-memory:pre_plan_hook",
                "ai-work-memory:pre_task_hook",
                "ai-auto-manual:pre_hook",
            ],
            "should_block": should_block,
            "block_reasons": block_reasons,
            "selected_manuals": manual_pre.get("selected_manuals", []),
            "required_reading": {
                "memory_order": pre_task.get("required_reading", {}).get("order", []),
                "manual_order": manual_pre.get("required_reading", {}).get("order", []),
            },
            "outputs": {
                "work_memory_pre_plan": pre_plan,
                "work_memory_pre_task": pre_task,
                "auto_manual_pre": manual_pre,
            },
        }

    def run_post(
        self,
        task_id: str,
        result_text: str,
        changed_files: list[str],
        completed_items: list[str],
        new_items: list[str],
        selected_manuals_override: list[str],
    ) -> dict[str, Any]:
        session = self._load_session(task_id)
        selected_manuals = selected_manuals_override or session.get("selected_manuals", [])
        if not changed_files:
            quality_rules = self.auto_quality_tracker.load_structured_file(
                self.auto_quality_root / "config" / "quality_rules.yaml"
            )
            quality_tracker = self.auto_quality_tracker.ChangeTracker(
                workspace_root=self.workspace_root, rules=quality_rules
            )
            snapshot = quality_tracker.snapshot(task_id)
            changed_files = [str(value) for value in snapshot.get("touched_files", [])]

        quality_post = self.auto_quality_post.run_post_quality_hook(
            task_id=task_id,
            result_text=result_text,
            changed_files=changed_files,
            finalize=True,
            skill_root=self.auto_quality_root,
            workspace_root=self.workspace_root,
        )
        manual_post = self.auto_manual_post.run_post_hook(
            result_text=result_text,
            changed_files=changed_files,
            selected_manuals=selected_manuals,
            skill_root=self.auto_manual_root,
            workspace_root=self.workspace_root,
        )
        memory_post = self.work_memory_post_task.run_post_task_hook(
            result_text=result_text,
            changed_files=changed_files,
            completed_items=completed_items,
            new_items=new_items,
            skill_root=self.work_memory_root,
            workspace_root=self.workspace_root,
        )
        agent_team_post = self.agent_team_pipeline.run_agent_pipeline(
            task_id=task_id,
            request_text=str(session.get("request_text", "")),
            result_text=result_text,
            changed_files=changed_files,
            context={
                "quality_post": quality_post,
                "manual_post": manual_post,
                "memory_post": memory_post,
                "selected_manuals": selected_manuals,
                "session": session,
            },
            skill_root=self.agent_team_root,
            workspace_root=self.workspace_root,
        )

        needs_attention = (
            quality_post.get("action") == "escalate"
            or not bool(manual_post.get("pass", True))
            or not bool(memory_post.get("pass", True))
            or not bool(agent_team_post.get("pass", True))
        )
        status = "needs_attention" if needs_attention else "ok"

        action = quality_post.get("action", "fix_now")
        team_gate_action = get_nested_value(agent_team_post, "gate.action", "pass")
        if team_gate_action == "escalate":
            action = "escalate"
        elif action == "fix_now" and team_gate_action in {"fix_now", "needs_fix"}:
            action = "fix_now"

        reminder_parts = [
            value
            for value in [
                quality_post.get("reminder_message", ""),
                manual_post.get("reminder_message", ""),
                memory_post.get("reminder_message", ""),
                _team_reminder(agent_team_post),
            ]
            if value
        ]
        aggregated_reminder = "\n\n".join(reminder_parts)

        merged_session = dict(session)
        merged_session["updated_at"] = now_iso()
        merged_session["selected_manuals"] = selected_manuals
        merged_session["post"] = {
            "auto_quality_post": quality_post,
            "auto_manual_post": manual_post,
            "work_memory_post": memory_post,
            "agent_team_post": agent_team_post,
        }
        merged_session["status"] = status
        self._save_session(task_id, merged_session)

        return {
            "task_id": task_id,
            "phase": "post",
            "order": [
                "ai-auto-quality:post_quality_hook",
                "ai-auto-manual:post_hook",
                "ai-work-memory:post_task_hook",
                "ai-agent-team:run_agent_pipeline",
            ],
            "status": status,
            "selected_manuals": selected_manuals,
            "action": action,
            "needs_attention": needs_attention,
            "reminder_message": aggregated_reminder,
            "outputs": {
                "ai_auto_quality_post": quality_post,
                "ai_auto_manual_post": manual_post,
                "ai_work_memory_post": memory_post,
                "ai_agent_team_post": agent_team_post,
            },
        }

    def _session_path(self, task_id: str) -> Path:
        safe = re.sub(r"[^a-zA-Z0-9._-]+", "_", task_id.strip()) or "default"
        return self.session_root / f"{safe}.json"

    def _load_session(self, task_id: str) -> dict[str, Any]:
        path = self._session_path(task_id)
        if path.exists():
            payload = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(payload, dict):
                return payload
        return {"task_id": task_id, "created_at": now_iso(), "updated_at": now_iso()}

    def _save_session(self, task_id: str, payload: dict[str, Any]) -> None:
        path = self._session_path(task_id)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Run integrated AI hook chain")
    parser.add_argument("--mode", required=True, choices=["pre", "post"], help="Chain mode")
    parser.add_argument("--task-id", required=True, help="Task ID")
    parser.add_argument("--request", default="", help="Request text (pre mode)")
    parser.add_argument("--result", default="", help="Result text (post mode)")
    parser.add_argument("--changed-files", default="[]", help="JSON array of changed files")
    parser.add_argument("--completed-items", default="[]", help="JSON array of completed items")
    parser.add_argument("--new-items", default="[]", help="JSON array of new items")
    parser.add_argument(
        "--selected-manuals", default="[]", help="JSON array of selected manuals override"
    )
    parser.add_argument("--workspace-root", default=None, help="Workspace root path")
    args = parser.parse_args()

    chain_root = Path(__file__).resolve().parents[1]
    workspace_root = Path(args.workspace_root) if args.workspace_root else Path.cwd()

    try:
        changed_files = parse_json_array(args.changed_files, "--changed-files")
        completed_items = parse_json_array(args.completed_items, "--completed-items")
        new_items = parse_json_array(args.new_items, "--new-items")
        selected_manuals = parse_json_array(args.selected_manuals, "--selected-manuals")

        chain = HookChain(chain_skill_root=chain_root, workspace_root=workspace_root)
        if args.mode == "pre":
            payload = chain.run_pre(
                task_id=args.task_id,
                request_text=args.request,
                changed_files=changed_files,
            )
        else:
            payload = chain.run_post(
                task_id=args.task_id,
                result_text=args.result,
                changed_files=changed_files,
                completed_items=completed_items,
                new_items=new_items,
                selected_manuals_override=selected_manuals,
            )
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
