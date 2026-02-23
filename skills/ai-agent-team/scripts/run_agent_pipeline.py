#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

from agent_utils import (
    contains_any,
    filter_files_by_globs,
    get_nested_value,
    load_structured_file,
    parse_json_array,
    parse_json_object,
    read_file,
    regex_match_any,
)
from review_gate import evaluate_gate


def _build_base_report(agent: dict[str, Any]) -> dict[str, Any]:
    return {
        "agent_id": str(agent.get("id", "unknown")),
        "role": str(agent.get("role", "Unknown")),
        "found": [],
        "fixed": [],
        "reason": "",
        "risk": "low",
        "evidence": [],
        "decision": "pass",
    }


def _validate_reports(
    reports: list[dict[str, Any]], schema: dict[str, Any]
) -> tuple[bool, list[str]]:
    required = [str(value) for value in schema.get("required_report_fields", [])]
    allowed_decisions = set(schema.get("allowed_decisions", []))
    allowed_risks = set(schema.get("allowed_risks", []))
    errors: list[str] = []

    for report in reports:
        agent_id = str(report.get("agent_id", "unknown"))
        for key in required:
            if key not in report:
                errors.append(f"{agent_id}: missing field {key}")
        if report.get("decision") not in allowed_decisions:
            errors.append(f"{agent_id}: invalid decision {report.get('decision')}")
        if report.get("risk") not in allowed_risks:
            errors.append(f"{agent_id}: invalid risk {report.get('risk')}")
    return len(errors) == 0, errors


def _run_planner(
    agent: dict[str, Any],
    workspace_root: Path,
    context: dict[str, Any],
) -> dict[str, Any]:
    report = _build_base_report(agent)
    found: list[str] = []
    evidence: list[str] = []

    memory_files = [
        ".ai-memory/plan.md",
        ".ai-memory/context.md",
        ".ai-memory/checklist.md",
    ]
    for rel in memory_files:
        abs_path = workspace_root / rel
        if not abs_path.exists():
            found.append(f"Missing memory file: {rel}")
        else:
            evidence.append(f"Found {rel}")

    memory_pass = bool(get_nested_value(context, "memory_post.pass", True))
    if not memory_pass:
        found.append("Work-memory post checks did not pass.")

    report["found"] = found
    report["evidence"] = evidence
    report["fixed"] = list(
        get_nested_value(context, "memory_post.completed_items", []) or []
    )
    report["reason"] = (
        "Planning analyst verifies external memory documents and execution tracking."
    )
    if found:
        report["decision"] = "needs_fix"
        report["risk"] = "medium"
    return report


def _run_tester(
    agent: dict[str, Any],
    result_text: str,
    changed_files: list[str],
    config: dict[str, Any],
) -> dict[str, Any]:
    report = _build_base_report(agent)
    tester_cfg = config.get("checks", {}).get("tester", {})

    must_mentions = [str(value) for value in tester_cfg.get("result_must_mention_any", [])]
    matched_mentions = contains_any(result_text, must_mentions)
    test_globs = [str(value) for value in tester_cfg.get("test_file_globs", [])]
    matched_test_files = filter_files_by_globs(changed_files, test_globs)

    found: list[str] = []
    if not matched_mentions:
        found.append("Result report does not mention validation commands or tests.")
    if not matched_test_files and not matched_mentions:
        found.append("No test-related file was touched in this task.")

    report["found"] = found
    report["evidence"] = [
        f"result_matches={matched_mentions}",
        f"test_files={matched_test_files}",
    ]
    report["reason"] = "Test analyst checks that validation evidence is explicitly reported."
    if found:
        report["decision"] = "needs_fix"
        report["risk"] = "medium"
    return report


def _run_reviewer(
    agent: dict[str, Any],
    changed_files: list[str],
    workspace_root: Path,
    context: dict[str, Any],
    config: dict[str, Any],
) -> dict[str, Any]:
    report = _build_base_report(agent)
    reviewer_cfg = config.get("checks", {}).get("reviewer", {})
    found: list[str] = []
    evidence: list[str] = []

    for dotted_key in reviewer_cfg.get("consistency_keys", []):
        value = get_nested_value(context, str(dotted_key), True)
        evidence.append(f"{dotted_key}={value}")
        if value is False:
            found.append(f"Consistency check failed: {dotted_key}")

    trigger_regex = str(reviewer_cfg.get("fetch_trigger_regex", ""))
    required_regex = [str(value) for value in reviewer_cfg.get("error_handling_required_regex", [])]
    for rel in changed_files:
        abs_path = workspace_root / rel
        if not abs_path.exists() or not abs_path.is_file():
            continue
        content = read_file(abs_path)
        if trigger_regex and re.search(trigger_regex, content, flags=re.IGNORECASE):
            matched_required = regex_match_any(content, required_regex)
            evidence.append(f"{rel}:error_matches={matched_required}")
            if not matched_required:
                found.append(f"Missing fetch error handling in {rel}")

    report["found"] = found
    report["evidence"] = evidence
    report["reason"] = "Code reviewer checks consistency across systems and reliability patterns."
    if found:
        report["decision"] = "needs_fix"
        report["risk"] = "high" if any("Consistency" in item for item in found) else "medium"
    return report


def _run_security(
    agent: dict[str, Any],
    changed_files: list[str],
    workspace_root: Path,
    config: dict[str, Any],
) -> dict[str, Any]:
    report = _build_base_report(agent)
    security_cfg = config.get("checks", {}).get("security", {})
    globs = [str(value) for value in security_cfg.get("file_globs", [])]
    candidates = filter_files_by_globs(changed_files, globs)

    critical_findings: list[str] = []
    high_findings: list[str] = []
    medium_findings: list[str] = []
    evidence: list[str] = []

    for rel in candidates:
        abs_path = workspace_root / rel
        if not abs_path.exists() or not abs_path.is_file():
            continue
        content = read_file(abs_path)
        critical = regex_match_any(content, [str(value) for value in security_cfg.get("critical_regex", [])])
        high = regex_match_any(content, [str(value) for value in security_cfg.get("high_regex", [])])
        medium = regex_match_any(content, [str(value) for value in security_cfg.get("medium_regex", [])])
        if critical:
            critical_findings.append(f"{rel}: critical pattern detected")
            evidence.append(f"{rel}: critical={critical}")
        if high:
            high_findings.append(f"{rel}: high-risk pattern detected")
            evidence.append(f"{rel}: high={high}")
        if medium:
            medium_findings.append(f"{rel}: medium-risk pattern detected")
            evidence.append(f"{rel}: medium={medium}")

    found = [*critical_findings, *high_findings, *medium_findings]
    report["found"] = found
    report["evidence"] = evidence
    report["reason"] = "Security reviewer scans touched files for credential leaks and unsafe execution."
    if critical_findings:
        report["decision"] = "escalate"
        report["risk"] = "critical"
    elif high_findings:
        report["decision"] = "needs_fix"
        report["risk"] = "high"
    elif medium_findings:
        report["decision"] = "needs_fix"
        report["risk"] = "medium"
    return report


def run_agent_pipeline(
    task_id: str,
    request_text: str,
    result_text: str,
    changed_files: list[str],
    context: dict[str, Any] | None = None,
    skill_root: Path | None = None,
    workspace_root: Path | None = None,
    agents_path: Path | None = None,
    schema_path: Path | None = None,
) -> dict[str, Any]:
    del request_text
    skill_root = Path(skill_root or Path(__file__).resolve().parents[1])
    workspace_root = Path(workspace_root or Path.cwd())
    agents_path = Path(agents_path or skill_root / "config" / "agents.yaml")
    schema_path = Path(schema_path or skill_root / "config" / "report_schema.json")
    context = context or {}

    config = load_structured_file(agents_path)
    schema = load_structured_file(schema_path)
    agents = [agent for agent in config.get("agents", []) if agent.get("enabled", True)]

    reports: list[dict[str, Any]] = []
    for agent in agents:
        kind = str(agent.get("kind", ""))
        if kind == "planner":
            reports.append(_run_planner(agent, workspace_root, context))
        elif kind == "tester":
            reports.append(_run_tester(agent, result_text, changed_files, config))
        elif kind == "reviewer":
            reports.append(
                _run_reviewer(agent, changed_files, workspace_root, context, config)
            )
        elif kind == "security":
            reports.append(_run_security(agent, changed_files, workspace_root, config))
        else:
            fallback = _build_base_report(agent)
            fallback["decision"] = "needs_fix"
            fallback["risk"] = "medium"
            fallback["found"] = [f"Unsupported agent kind: {kind}"]
            fallback["reason"] = "Agent configuration must define a supported kind."
            reports.append(fallback)

    valid, schema_errors = _validate_reports(reports, schema)
    gate = evaluate_gate(reports, config.get("gate", {}))
    summary = {
        "total_reports": len(reports),
        "pass_reports": sum(1 for item in reports if item.get("decision") == "pass"),
        "needs_fix_reports": sum(1 for item in reports if item.get("decision") == "needs_fix"),
        "escalate_reports": sum(1 for item in reports if item.get("decision") == "escalate"),
    }

    pass_value = gate["status"] == "pass" and valid
    if not valid:
        gate = dict(gate)
        gate["status"] = "needs_attention"
        gate["action"] = "escalate"
        gate["reasons"] = [*gate.get("reasons", []), "Schema validation failed for team reports."]

    return {
        "task_id": task_id,
        "reports": reports,
        "summary": summary,
        "gate": gate,
        "schema_valid": valid,
        "schema_errors": schema_errors,
        "pass": pass_value,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Run specialist agent team pipeline")
    parser.add_argument("--task-id", required=True, help="Task ID")
    parser.add_argument("--request", default="", help="Request text")
    parser.add_argument("--result", required=True, help="Result summary text")
    parser.add_argument("--changed-files", default="[]", help="JSON array of changed files")
    parser.add_argument("--context-json", default="{}", help="JSON object with system outputs")
    parser.add_argument("--workspace-root", default=None, help="Workspace root path")
    parser.add_argument("--agents-path", default=None, help="Agent config path")
    parser.add_argument("--schema-path", default=None, help="Report schema path")
    args = parser.parse_args()

    skill_root = Path(__file__).resolve().parents[1]
    workspace_root = Path(args.workspace_root) if args.workspace_root else Path.cwd()
    try:
        changed_files = parse_json_array(args.changed_files, "--changed-files")
        context_json = parse_json_object(args.context_json, "--context-json")
        payload = run_agent_pipeline(
            task_id=args.task_id,
            request_text=args.request,
            result_text=args.result,
            changed_files=changed_files,
            context=context_json,
            skill_root=skill_root,
            workspace_root=workspace_root,
            agents_path=Path(args.agents_path) if args.agents_path else None,
            schema_path=Path(args.schema_path) if args.schema_path else None,
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
