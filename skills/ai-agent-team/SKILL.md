---
name: "ai-agent-team"
description: "Run a specialist AI team pipeline after implementation. Use when Codex must split review duties across planner/test/reviewer/security roles, force structured reports, and apply a review gate before final sign-off."
---

# AI Agent Team

Run specialist role reports with a unified post-task gate.

## Roles

1. Planning analyst
2. Test analyst
3. Code reviewer
4. Security reviewer

## Required Report Fields

- `found`
- `fixed`
- `reason`
- `risk`
- `evidence`
- `decision`

## Commands

```bash
python3 scripts/run_agent_pipeline.py --task-id "task-001" --result "Completed: API update" --changed-files '["app/api/users/route.ts"]'
python3 -m unittest tests/test_agent_pipeline.py
```
