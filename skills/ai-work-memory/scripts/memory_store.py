#!/usr/bin/env python3
from __future__ import annotations

import fnmatch
import json
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


class MemoryConfigError(RuntimeError):
    pass


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
            raise MemoryConfigError(
                "Config file is not valid JSON and PyYAML is unavailable."
            ) from exc
        parsed = yaml.safe_load(raw)
    if not isinstance(parsed, dict):
        raise MemoryConfigError("Config root must be an object.")
    return parsed


def normalize_text(text: str) -> str:
    lowered = text.lower().strip()
    lowered = re.sub(r"\s+", " ", lowered)
    lowered = re.sub(r"[^a-z0-9가-힣 ]+", "", lowered)
    return lowered


def match_patterns(
    target: str,
    patterns: list[str],
    matcher: str = "contains",
    case_sensitive: bool = False,
) -> list[str]:
    if not target:
        return []

    matched: list[str] = []
    for pattern in patterns:
        if matcher == "contains":
            haystack = target if case_sensitive else target.lower()
            needle = pattern if case_sensitive else pattern.lower()
            if needle in haystack:
                matched.append(pattern)
        elif matcher == "regex":
            flags = 0 if case_sensitive else re.IGNORECASE | re.MULTILINE
            if re.search(pattern, target, flags=flags):
                matched.append(pattern)
        else:
            raise MemoryConfigError(f"Unsupported matcher: {matcher}")
    return matched


def extract_prefixed_items(result_text: str, prefixes: list[str]) -> list[str]:
    output: list[str] = []
    lines = [line.strip() for line in result_text.splitlines() if line.strip()]
    for line in lines:
        for prefix in prefixes:
            if line.lower().startswith(prefix.lower()):
                value = line[len(prefix) :].strip()
                parts = re.split(r"[;,/]\s*|\s+\|\s+", value)
                for part in parts:
                    cleaned = part.strip(" -")
                    if cleaned:
                        output.append(cleaned)
    return list(dict.fromkeys(output))


def replace_last_updated(text: str) -> str:
    stamp = f"Last Updated: {now_iso()}"
    lines = text.splitlines()
    for idx, line in enumerate(lines):
        if line.startswith("Last Updated:"):
            lines[idx] = stamp
            return "\n".join(lines).strip() + "\n"
    if not lines:
        return stamp + "\n"
    if lines[0].startswith("#"):
        merged = [lines[0], "", stamp] + lines[1:]
        return "\n".join(merged).strip() + "\n"
    return stamp + "\n" + "\n".join(lines).strip() + "\n"


@dataclass
class ChecklistEntry:
    section: str
    status: str
    text: str


class MemoryRuleEngine:
    def __init__(self, rules: dict[str, Any]) -> None:
        self.rules = rules

    def detect_large_task(self, request_text: str, changed_files: list[str]) -> dict[str, Any]:
        config = self.rules.get("large_task_detection", {})
        weights = config.get("weights", {})
        threshold = int(config.get("threshold", 1))
        reasons: list[dict[str, Any]] = []
        score = 0

        score += self._apply_text_rule_set(
            reason_bucket=reasons,
            request_text=request_text,
            rules=config.get("keyword_rules", []),
            criterion="keyword",
            weight=int(weights.get("keyword", 1)),
        )
        score += self._apply_text_rule_set(
            reason_bucket=reasons,
            request_text=request_text,
            rules=config.get("intent_rules", []),
            criterion="intent",
            weight=int(weights.get("intent", 1)),
        )
        score += self._apply_path_rule_set(
            reason_bucket=reasons,
            changed_files=changed_files,
            rules=config.get("path_rules", []),
            weight=int(weights.get("path", 1)),
        )

        length_threshold = int(config.get("request_length_threshold", 0))
        if len(request_text.strip()) >= length_threshold and length_threshold > 0:
            delta = int(weights.get("length", 1))
            score += delta
            reasons.append(
                {
                    "criterion": "length",
                    "rule_id": "request_length_threshold",
                    "score": delta,
                    "matched": len(request_text.strip()),
                }
            )

        return {
            "is_large_task": score >= threshold,
            "score": score,
            "threshold": threshold,
            "reasons": reasons,
        }

    def evaluate_result_quality(self, result_text: str) -> dict[str, Any]:
        checks_config = self.rules.get("post_quality_checks", [])
        checks: list[dict[str, Any]] = []
        missing_items: list[str] = []

        for check in checks_config:
            matcher = check.get("matcher", "contains")
            matched = match_patterns(
                target=result_text,
                patterns=check.get("patterns", []),
                matcher=matcher,
                case_sensitive=bool(check.get("case_sensitive", False)),
            )
            condition = check.get("condition", "must_match")
            if condition == "must_match":
                passed = bool(matched)
            elif condition == "must_not_match":
                passed = not bool(matched)
            else:
                raise MemoryConfigError(f"Unsupported check condition: {condition}")

            checks.append(
                {
                    "id": check.get("id", "unknown"),
                    "condition": condition,
                    "pass": passed,
                    "matched_patterns": matched,
                    "message": check.get("message", ""),
                }
            )
            if not passed and check.get("message"):
                missing_items.append(check["message"])

        unique_missing = list(dict.fromkeys(missing_items))
        return {"checks": checks, "missing_items": unique_missing, "pass": len(unique_missing) == 0}

    def _apply_text_rule_set(
        self,
        reason_bucket: list[dict[str, Any]],
        request_text: str,
        rules: list[dict[str, Any]],
        criterion: str,
        weight: int,
    ) -> int:
        total = 0
        for rule in rules:
            matched = match_patterns(
                target=request_text,
                patterns=rule.get("patterns", []),
                matcher=rule.get("matcher", "contains"),
                case_sensitive=bool(rule.get("case_sensitive", False)),
            )
            if matched:
                total += weight
                reason_bucket.append(
                    {
                        "criterion": criterion,
                        "rule_id": rule.get("id", "unknown"),
                        "score": weight,
                        "matched": matched,
                    }
                )
        return total

    def _apply_path_rule_set(
        self,
        reason_bucket: list[dict[str, Any]],
        changed_files: list[str],
        rules: list[dict[str, Any]],
        weight: int,
    ) -> int:
        total = 0
        for rule in rules:
            matcher = rule.get("matcher", "glob")
            patterns = rule.get("patterns", [])
            matched_files: list[str] = []
            for file_path in changed_files:
                if matcher == "glob":
                    if any(fnmatch.fnmatch(file_path, pattern) for pattern in patterns):
                        matched_files.append(file_path)
                elif matcher == "contains":
                    if any(pattern.lower() in file_path.lower() for pattern in patterns):
                        matched_files.append(file_path)
                elif matcher == "regex":
                    if any(re.search(pattern, file_path) for pattern in patterns):
                        matched_files.append(file_path)
                else:
                    raise MemoryConfigError(f"Unsupported path matcher: {matcher}")

            if matched_files:
                total += weight
                reason_bucket.append(
                    {
                        "criterion": "path",
                        "rule_id": rule.get("id", "unknown"),
                        "score": weight,
                        "matched_files": sorted(set(matched_files)),
                    }
                )
        return total


class MemoryStore:
    def __init__(self, skill_root: Path, workspace_root: Path, rules: dict[str, Any]) -> None:
        self.skill_root = Path(skill_root)
        self.workspace_root = Path(workspace_root)
        self.rules = rules
        self.templates_dir = self.skill_root / "templates"

    def document_paths(self) -> dict[str, Path]:
        configured = self.rules.get("document_paths", {})
        required = ("plan", "context", "checklist")
        output: dict[str, Path] = {}
        for key in required:
            rel = configured.get(key)
            if not rel:
                raise MemoryConfigError(f"Missing document path config for '{key}'.")
            output[key] = self.workspace_root / Path(rel)
        return output

    def document_relative_paths(self) -> dict[str, str]:
        result: dict[str, str] = {}
        for key, abs_path in self.document_paths().items():
            try:
                rel = abs_path.relative_to(self.workspace_root).as_posix()
            except ValueError:
                rel = abs_path.as_posix()
            result[key] = rel
        return result

    def ensure_documents(self) -> list[str]:
        created: list[str] = []
        for name, abs_path in self.document_paths().items():
            if abs_path.exists():
                continue
            abs_path.parent.mkdir(parents=True, exist_ok=True)
            template = self._load_template(name)
            rendered = template.replace("{{timestamp}}", now_iso())
            abs_path.write_text(rendered.strip() + "\n", encoding="utf-8")
            created.append(self._to_rel(abs_path))
        return created

    def load_documents(self) -> dict[str, str]:
        output: dict[str, str] = {}
        for name, abs_path in self.document_paths().items():
            if not abs_path.exists():
                output[name] = ""
                continue
            output[name] = abs_path.read_text(encoding="utf-8")
        return output

    def save_documents(self, docs: dict[str, str]) -> None:
        for name, content in docs.items():
            path_map = self.document_paths()
            abs_path = path_map[name]
            abs_path.parent.mkdir(parents=True, exist_ok=True)
            abs_path.write_text(content.strip() + "\n", encoding="utf-8")

    def parse_plan_status(self, plan_text: str) -> str:
        status_cfg = self.rules.get("plan_rules", {})
        key = status_cfg.get("status_key", "Status:")
        for line in plan_text.splitlines():
            if line.strip().startswith(key):
                return line.split(key, 1)[1].strip().upper()
        return "UNKNOWN"

    def required_plan_status(self) -> str:
        return str(
            self.rules.get("plan_rules", {}).get("required_status", "APPROVED")
        ).upper()

    def parse_checklist(self, checklist_text: str) -> list[ChecklistEntry]:
        section = ""
        entries: list[ChecklistEntry] = []
        line_pattern = re.compile(r"^- \[( |x|>)\]\s+(.+)$")
        for line in checklist_text.splitlines():
            header_match = re.match(r"^##\s+(.+)$", line.strip())
            if header_match:
                section = header_match.group(1).strip().lower()
                continue
            task_match = line_pattern.match(line.strip())
            if not task_match:
                continue
            marker = task_match.group(1)
            text = task_match.group(2).strip()
            if text == "(none)":
                continue
            status = "todo"
            if marker == "x":
                status = "done"
            elif marker == ">":
                status = "in_progress"
            entries.append(ChecklistEntry(section=section, status=status, text=text))
        return entries

    def checklist_stats(self, entries: list[ChecklistEntry]) -> dict[str, int]:
        counts = {"todo": 0, "in_progress": 0, "done": 0}
        for entry in entries:
            if entry.status in counts:
                counts[entry.status] += 1
        return counts

    def suggest_next_tasks(self, entries: list[ChecklistEntry], slots: int) -> list[str]:
        if slots <= 0:
            return []
        todos = [entry.text for entry in entries if entry.status == "todo"]
        return todos[:slots]

    def update_checklist(
        self,
        checklist_text: str,
        completed_items: list[str],
        new_items: list[str],
        max_in_progress: int,
    ) -> tuple[str, dict[str, Any]]:
        entries = self.parse_checklist(checklist_text)
        in_progress = [entry.text for entry in entries if entry.status == "in_progress"]
        todo = [entry.text for entry in entries if entry.status == "todo"]
        done = [entry.text for entry in entries if entry.status == "done"]

        normalized_completed = [normalize_text(value) for value in completed_items if value.strip()]
        newly_done: list[str] = []

        def _move_to_done(bucket: list[str]) -> list[str]:
            remaining: list[str] = []
            for task in bucket:
                norm_task = normalize_text(task)
                matched = any(
                    done_key in norm_task or norm_task in done_key
                    for done_key in normalized_completed
                    if done_key
                )
                if matched:
                    newly_done.append(task)
                else:
                    remaining.append(task)
            return remaining

        in_progress = _move_to_done(in_progress)
        todo = _move_to_done(todo)
        done.extend(newly_done)

        current_all = [*in_progress, *todo, *done]
        for candidate in new_items:
            cleaned = candidate.strip()
            if not cleaned:
                continue
            if any(normalize_text(cleaned) == normalize_text(existing) for existing in current_all):
                continue
            todo.append(cleaned)
            current_all.append(cleaned)

        while len(in_progress) < max_in_progress and todo:
            in_progress.append(todo.pop(0))

        updated = self.render_checklist(in_progress=in_progress, todo=todo, done=done)
        stats = self.checklist_stats(self.parse_checklist(updated))
        return updated, {"newly_done": newly_done, "stats": stats}

    def append_context_update(
        self,
        context_text: str,
        result_text: str,
        decisions: list[str],
        next_steps: list[str],
    ) -> str:
        updated = replace_last_updated(context_text).rstrip()
        if "## Session Updates" not in updated:
            updated += "\n\n## Session Updates\n"

        lines: list[str] = [f"- {now_iso()} | Result: {result_text.strip()}"]
        if decisions:
            lines.append(f"- {now_iso()} | Decisions: {', '.join(decisions)}")
        if next_steps:
            lines.append(f"- {now_iso()} | Next: {', '.join(next_steps)}")
        updated += "\n" + "\n".join(lines) + "\n"
        return updated

    def _load_template(self, document_name: str) -> str:
        template_path = self.templates_dir / f"{document_name}.md"
        if not template_path.exists():
            raise MemoryConfigError(f"Template missing: {template_path}")
        return template_path.read_text(encoding="utf-8")

    def _to_rel(self, path: Path) -> str:
        try:
            return path.relative_to(self.workspace_root).as_posix()
        except ValueError:
            return path.as_posix()

    def render_checklist(self, in_progress: list[str], todo: list[str], done: list[str]) -> str:
        content = [
            "# Task Checklist",
            "",
            f"Last Updated: {now_iso()}",
            "",
            "## In Progress",
        ]
        if in_progress:
            content.extend([f"- [>] {task}" for task in in_progress])
        else:
            content.append("- [>] (none)")
        content.extend(["", "## Todo"])
        if todo:
            content.extend([f"- [ ] {task}" for task in todo])
        else:
            content.append("- [ ] (none)")
        content.extend(["", "## Done"])
        if done:
            content.extend([f"- [x] {task}" for task in done])
        else:
            content.append("- [x] (none)")
        return "\n".join(content).strip() + "\n"
