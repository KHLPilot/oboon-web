---
name: "ai-auto-manual"
description: "Build and run a hook-based manual enforcement system for coding tasks. Use when Codex must auto-select manuals before work, enforce index-first loading, and run post-completion checks for security, error handling, and missing items."
---

# AI Auto Manual

Implement pre-task and post-task hooks with an external rule engine.

## Workflow

1. Run pre-hook with request text and changed file list.
2. Read `manuals/index.md` first.
3. Load only selected manual chapters.
4. Run post-hook with result text and selected manuals.
5. Add reminder message if checks fail.

## Commands

```bash
python3 scripts/pre_hook.py --request "Implement API endpoint" --changed-files '["app/api/users/route.ts"]'
python3 scripts/post_hook.py --result "Implemented endpoint with auth and tests" --changed-files '["app/api/users/route.ts"]' --selected-manuals '["backend","security"]'
python3 -m unittest tests/test_hooks.py
```

## Files

- Rules: `config/rules.yaml`
- Hook settings: `config/hooks.yaml`
- Manuals: `manuals/*.md`
- Engine: `scripts/rule_engine.py`
- Hooks: `scripts/pre_hook.py`, `scripts/post_hook.py`
