#!/usr/bin/env python3
from __future__ import annotations

from typing import Any


def build_reminder(
    touched_files: list[str], findings: list[dict[str, Any]], reminder_config: dict[str, Any]
) -> str:
    prefix = str(reminder_config.get("prefix", "셀프 체크 리마인더"))
    top_files_count = int(reminder_config.get("top_files_count", 2))
    questions = reminder_config.get("questions", [])
    top_files = touched_files[:top_files_count]

    top_findings = findings[:2]
    finding_blobs: list[str] = []
    for finding in top_findings:
        severity = str(finding.get("severity", "low")).lower()
        message = str(finding.get("message", "점검 필요 항목"))
        file_path = str(finding.get("file", "")).strip()
        if file_path:
            finding_blobs.append(f"[{severity}] {file_path}: {message}")
        else:
            finding_blobs.append(f"[{severity}] {message}")

    lines = [f"{prefix}:"]
    if top_files:
        lines.append(f"- 우선 재확인 파일: {', '.join(top_files)}")
    else:
        lines.append("- 우선 재확인 파일: (기록된 파일 없음)")

    if finding_blobs:
        lines.append(f"- 즉시 확인 이슈: {' | '.join(finding_blobs)}")
    else:
        lines.append("- 즉시 확인 이슈: 현재 차단 이슈 없음")

    for question in questions:
        lines.append(f"- {question}")
    return "\n".join(lines)
