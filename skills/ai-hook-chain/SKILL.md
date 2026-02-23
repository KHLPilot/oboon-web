---
name: "ai-hook-chain"
description: "Orchestrate ai-work-memory, ai-auto-manual, and ai-auto-quality as one hook chain. Use when Codex must run unified pre/post hooks with consistent session state, blocking gates, and aggregated outputs."
---

# AI Hook Chain

Run a single entrypoint that chains three systems:

1. `ai-work-memory` (plan/task memory gates)
2. `ai-auto-manual` (manual auto-loading)
3. `ai-auto-quality` (completion-time quality inspection)
4. `ai-agent-team` (specialist role reports + review gate)

## Execution Order

- Pre chain:
  1. work-memory pre-plan
  2. work-memory pre-task
  3. auto-manual pre
- Post chain:
  1. auto-quality post
  2. auto-manual post
  3. work-memory post
  4. agent-team post

## Commands

```bash
python3 scripts/run_chain.py --mode pre --task-id "task-001" --request "API 구현" --changed-files '["app/api/users/route.ts"]'
python3 scripts/run_chain.py --mode post --task-id "task-001" --result "Completed: API 구현; Decision: auth 유지; Next: UI 연결" --changed-files '["app/api/users/route.ts"]'
python3 -m unittest tests/test_hook_chain.py
```
