# Security Manual

## Scope

- authentication and authorization
- request signing/token/header handling
- external API calls

## Required Practices

1. Protect API calls with auth/token/csrf or equivalent control.
2. Add timeout or abort guard for network calls.
3. Avoid logging sensitive secrets.
4. Validate untrusted input and encode output.

## Output Checklist

- Mention one concrete protection method.
- Mention secret handling decision.
