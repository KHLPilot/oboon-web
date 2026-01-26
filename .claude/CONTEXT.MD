# Project Constitution (Summary)

This project strictly follows these rules:

1. Routing only in app/
2. Domain SSOT lives in features/<domain>
3. Domain UI lives in features/<domain>/components
4. Shared UI only in components/ui or components/shared
5. Unidirectional dependency:
   app → components → services/mappers → domain
6. UTF-8 only, Korean text must never be modified or escaped
7. Do NOT invent new structure. Follow existing patterns.

If a request violates these rules, you must refuse and explain why.
