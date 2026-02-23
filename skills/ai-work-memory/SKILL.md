---
name: "ai-work-memory"
description: "Run a persistent work-memory system for long coding sessions. Use when Codex must prevent context loss by enforcing plan-first execution, generating and maintaining plan/context/checklist documents, and updating memory state after each task."
---

# AI Work Memory

Use hook scripts to enforce external memory documents and small-batch execution.

## Workflow

1. Run pre-plan hook for large tasks.
2. Block coding until `plan.md` is approved.
3. Run pre-task hook before each implementation unit.
4. Keep max in-progress items under configured limit.
5. Run post-task hook to update context/checklist and emit reminders.

## Commands

```bash
python3 scripts/pre_plan_hook.py --request "새 기능 만들어줘 API와 UI 모두"
python3 scripts/pre_task_hook.py --request "다음 작업 진행"
python3 scripts/post_task_hook.py --result "Completed: API validation; Decision: keep current schema"
python3 -m unittest tests/test_memory_hooks.py
```

## Files

- Rules: `config/memory_rules.yaml`
- Hook wiring: `config/hooks.yaml`
- Templates: `templates/*.md`
- Engine/storage: `scripts/memory_store.py`
- Hooks: `scripts/pre_plan_hook.py`, `scripts/pre_task_hook.py`, `scripts/post_task_hook.py`
