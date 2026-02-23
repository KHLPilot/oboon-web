#!/usr/bin/env python3
from __future__ import annotations

from typing import Any


def evaluate_gate(reports: list[dict[str, Any]], gate_config: dict[str, Any]) -> dict[str, Any]:
    decisions = [str(report.get("decision", "needs_fix")) for report in reports]
    needs_fix_count = sum(1 for value in decisions if value == "needs_fix")
    escalate_count = sum(1 for value in decisions if value == "escalate")
    pass_count = sum(1 for value in decisions if value == "pass")
    total = len(reports)

    reasons: list[str] = []
    action = "pass"
    status = "pass"

    if gate_config.get("escalate_if_any_escalate", True) and escalate_count > 0:
        status = "needs_attention"
        action = "escalate"
        reasons.append("At least one specialist requested escalation.")
    else:
        threshold = int(gate_config.get("needs_fix_threshold_for_escalate", 3))
        if needs_fix_count >= threshold:
            status = "needs_attention"
            action = "escalate"
            reasons.append("Too many specialist reports requested fixes.")
        elif needs_fix_count > 0:
            status = "needs_attention"
            action = str(gate_config.get("default_action_when_needs_fix", "fix_now"))
            reasons.append("Specialist reports requested follow-up fixes.")
        else:
            reasons.append("All specialist reports passed.")

    return {
        "status": status,
        "action": action,
        "reasons": reasons,
        "counts": {
            "total": total,
            "pass": pass_count,
            "needs_fix": needs_fix_count,
            "escalate": escalate_count,
        },
    }

