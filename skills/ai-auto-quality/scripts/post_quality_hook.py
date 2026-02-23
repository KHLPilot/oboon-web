#!/usr/bin/env python3
from __future__ import annotations

import argparse
import fnmatch
import json
import re
import sys
from pathlib import Path
from typing import Any

from change_tracker import ChangeTracker, load_structured_file, parse_json_array
from quality_router import route_action
from self_check_reminder import build_reminder


def _read_file(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return path.read_text(encoding="utf-8", errors="ignore")


def _matches_any(text: str, patterns: list[str], matcher: str) -> list[str]:
    matches: list[str] = []
    for pattern in patterns:
        if matcher == "contains":
            if pattern.lower() in text.lower():
                matches.append(pattern)
        elif matcher == "regex":
            if re.search(pattern, text, flags=re.IGNORECASE | re.MULTILINE):
                matches.append(pattern)
        else:
            raise RuntimeError(f"Unsupported matcher: {matcher}")
    return matches


def _check_condition(condition: str, matched_patterns: list[str]) -> bool:
    if condition == "must_match":
        return bool(matched_patterns)
    if condition == "must_not_match":
        return not bool(matched_patterns)
    raise RuntimeError(f"Unsupported condition: {condition}")


def _filter_files(files: list[str], globs: list[str]) -> list[str]:
    if not globs:
        return files
    return [path for path in files if any(fnmatch.fnmatch(path, pattern) for pattern in globs)]


def _build_file_findings(
    rules: dict[str, Any],
    checks: list[dict[str, Any]],
    touched_files: list[str],
    workspace_root: Path,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    findings: list[dict[str, Any]] = []
    check_results: list[dict[str, Any]] = []

    for check in checks:
        if check.get("scope", "files") != "files":
            continue
        matcher = check.get("matcher", "regex")
        condition = check.get("condition", "must_not_match")
        patterns = check.get("patterns", [])
        file_globs = check.get("file_globs", [])
        requires_any = check.get("requires_any_patterns", [])

        candidates = _filter_files(touched_files, file_globs)
        evaluated_files: list[str] = []
        failed_files: list[str] = []

        for rel_path in candidates:
            abs_path = workspace_root / Path(rel_path)
            if not abs_path.exists() or not abs_path.is_file():
                continue
            content = _read_file(abs_path)
            if requires_any:
                requires_hit = _matches_any(content, requires_any, "regex")
                if not requires_hit:
                    continue

            matched = _matches_any(content, patterns, matcher)
            passed = _check_condition(condition, matched)
            evaluated_files.append(rel_path)
            if not passed:
                failed_files.append(rel_path)
                findings.append(
                    {
                        "rule_id": check.get("id", "unknown"),
                        "severity": check.get("severity", "low"),
                        "file": rel_path,
                        "message": check.get("message", "품질 기준 위반"),
                        "matched_patterns": matched,
                    }
                )

        check_results.append(
            {
                "id": check.get("id", "unknown"),
                "scope": "files",
                "severity": check.get("severity", "low"),
                "pass": len(failed_files) == 0,
                "evaluated_files": evaluated_files,
                "failed_files": failed_files,
            }
        )

    return findings, check_results


def _build_result_findings(result_text: str, checks: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    findings: list[dict[str, Any]] = []
    check_results: list[dict[str, Any]] = []

    for check in checks:
        if check.get("scope", "files") != "result":
            continue
        matcher = check.get("matcher", "contains")
        condition = check.get("condition", "must_match")
        patterns = check.get("patterns", [])
        matched = _matches_any(result_text, patterns, matcher)
        passed = _check_condition(condition, matched)

        if not passed:
            findings.append(
                {
                    "rule_id": check.get("id", "unknown"),
                    "severity": check.get("severity", "low"),
                    "file": "",
                    "message": check.get("message", "결과 요약 기준 미충족"),
                    "matched_patterns": matched,
                }
            )
        check_results.append(
            {
                "id": check.get("id", "unknown"),
                "scope": "result",
                "severity": check.get("severity", "low"),
                "pass": passed,
                "matched_patterns": matched,
            }
        )

    return findings, check_results


def run_post_quality_hook(
    task_id: str,
    result_text: str,
    changed_files: list[str],
    finalize: bool = True,
    skill_root: Path | None = None,
    workspace_root: Path | None = None,
    rules_path: Path | None = None,
) -> dict[str, Any]:
    skill_root = Path(skill_root or Path(__file__).resolve().parents[1])
    workspace_root = Path(workspace_root or Path.cwd())
    rules_path = Path(rules_path or skill_root / "config" / "quality_rules.yaml")
    rules = load_structured_file(rules_path)

    tracker = ChangeTracker(workspace_root=workspace_root, rules=rules)
    tracker.start(task_id)
    tracker.record(task_id, changed_files, event_type="post_task_input")
    session = tracker.snapshot(task_id)
    touched_files = [str(value) for value in session.get("touched_files", [])]

    checks = rules.get("checks", [])
    file_findings, file_results = _build_file_findings(
        rules=rules,
        checks=checks,
        touched_files=touched_files,
        workspace_root=workspace_root,
    )
    result_findings, result_results = _build_result_findings(
        result_text=result_text,
        checks=checks,
    )
    findings = [*file_findings, *result_findings]
    routing = route_action(findings=findings, rules=rules)
    reminder = build_reminder(
        touched_files=touched_files,
        findings=findings,
        reminder_config=rules.get("reminder", {}),
    )

    if finalize:
        tracker.end(task_id)

    return {
        "task_id": task_id,
        "touched_files": touched_files,
        "findings": findings,
        "severity_counts": routing["severity_counts"],
        "action": routing["action"],
        "reason": routing["reason"],
        "recommendation": routing["recommendation"],
        "checks": [*file_results, *result_results],
        "reminder_message": reminder,
        "pass": len(findings) == 0,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Run post-task quality inspection")
    parser.add_argument("--task-id", required=True, help="Task session ID")
    parser.add_argument("--result", required=True, help="Result summary text")
    parser.add_argument("--changed-files", default="[]", help="JSON array of changed files")
    parser.add_argument("--rules-path", default=None, help="Rules file path")
    parser.add_argument("--workspace-root", default=None, help="Workspace root path")
    parser.add_argument("--finalize", action="store_true", help="Finalize tracker session")
    args = parser.parse_args()

    try:
        changed_files = parse_json_array(args.changed_files, "--changed-files")
        payload = run_post_quality_hook(
            task_id=args.task_id,
            result_text=args.result,
            changed_files=changed_files,
            finalize=args.finalize,
            rules_path=Path(args.rules_path) if args.rules_path else None,
            workspace_root=Path(args.workspace_root) if args.workspace_root else None,
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
