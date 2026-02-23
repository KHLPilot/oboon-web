# Backend Manual

## Scope

- API route handlers
- service/repository layers
- DB transaction boundaries

## Required Practices

1. Validate request input before business logic.
2. Use explicit authorization checks for protected resources.
3. Return stable response shape and status codes.
4. Add deterministic error branch with safe message.

## Output Checklist

- Mention endpoint behavior.
- Mention validation strategy.
- Mention error path behavior.
