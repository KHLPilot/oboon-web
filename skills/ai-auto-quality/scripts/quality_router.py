#!/usr/bin/env python3
from __future__ import annotations

from typing import Any


def severity_counts(findings: list[dict[str, Any]]) -> dict[str, int]:
    counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for finding in findings:
        severity = str(finding.get("severity", "low")).lower()
        if severity in counts:
            counts[severity] += 1
    return counts


def route_action(findings: list[dict[str, Any]], rules: dict[str, Any]) -> dict[str, Any]:
    routing = rules.get("routing", {})
    counts = severity_counts(findings)
    critical_limit = int(routing.get("critical_escalate_min", 1))
    high_limit = int(routing.get("high_escalate_min", 3))
    total_limit = int(routing.get("total_escalate_min", 7))
    total = sum(counts.values())

    action = "fix_now"
    reason = "이슈 수가 제한 이내라 즉시 수정 루프를 권장합니다."

    if counts["critical"] >= critical_limit:
        action = "escalate"
        reason = "치명 이슈가 임계치를 넘어서 전문 리뷰 권장 상태입니다."
    elif counts["high"] >= high_limit:
        action = "escalate"
        reason = "높은 심각도 이슈가 임계치를 넘었습니다."
    elif total >= total_limit:
        action = "escalate"
        reason = "전체 이슈가 임계치를 넘었습니다."
    elif total == 0:
        reason = "차단 이슈가 없습니다."

    recommendation = (
        "전문 수리 담당(리뷰어) 검토를 요청하세요."
        if action == "escalate"
        else "발견된 항목을 즉시 수정한 뒤 다시 검사하세요."
    )

    return {
        "action": action,
        "reason": reason,
        "recommendation": recommendation,
        "severity_counts": counts,
        "total_findings": total,
    }
