---
name: "ai-auto-quality"
description: "Run an automatic quality gate after AI task completion. Use when Codex must track touched files, run configurable quality checks, route outcomes to fix-now or escalation, and emit self-check reminders."
---

# AI Auto Quality

Provide a quality gate with session-based change tracking and configurable checks.

## Workflow

1. Start quality session with task ID.
2. Record touched files while editing.
3. Run post-task quality hook at completion.
4. Route to `fix_now` or `escalate` by severity thresholds.
5. Emit self-check reminder focused on touched files.

## Commands

```bash
python3 scripts/change_tracker.py --task-id "task-001" --mode start
python3 scripts/change_tracker.py --task-id "task-001" --mode record --changed-files '["app/api/users/route.ts"]'
python3 scripts/post_quality_hook.py --task-id "task-001" --result "Completed API update" --changed-files '["app/api/users/route.ts"]'
python3 -m unittest tests/test_quality_hooks.py
```

## Files

- Rules: `config/quality_rules.yaml`
- Hook wiring: `config/hooks.yaml`
- Tracker: `scripts/change_tracker.py`
- Gate: `scripts/post_quality_hook.py`
- Router: `scripts/quality_router.py`
- Reminder: `scripts/self_check_reminder.py`
