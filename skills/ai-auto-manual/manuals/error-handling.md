# Error Handling Manual

## Scope

- exception boundaries
- fallback behavior
- retry and recovery path

## Required Practices

1. Use `try/catch` or equivalent branch for failure handling.
2. Return safe and actionable error messages.
3. Distinguish user-facing vs internal error details.
4. Add logging context without leaking secrets.

## Output Checklist

- Mention failure mode coverage.
- Mention fallback or retry strategy.
