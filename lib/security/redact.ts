type Primitive = string | number | boolean | null | undefined;

type LogContext = Record<string, Primitive>;

const REDACTED = "[redacted]";

const SENSITIVE_KEY_PATTERNS = [
  "email",
  "phone",
  "token",
  "secret",
  "password",
  "passwd",
  "session",
  "cookie",
  "authorization",
  "bearer",
  "apiKey",
  "apikey",
  "accessKey",
  "secretKey",
  "key",
];

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isSensitiveKey(key: string): boolean {
  const normalized = normalizeKey(key);
  return SENSITIVE_KEY_PATTERNS.some((pattern) =>
    normalized.includes(normalizeKey(pattern)),
  );
}

function redactPrimitive(value: Primitive, sensitive: boolean): Primitive {
  if (!sensitive) {
    return value;
  }

  if (value == null) {
    return value;
  }

  return REDACTED;
}

export function redactLogContext(context?: LogContext): LogContext | undefined {
  if (!context) {
    return undefined;
  }

  const entries = Object.entries(context);
  if (entries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(
    entries.map(([key, value]) => [key, redactPrimitive(value, isSensitiveKey(key))]),
  );
}
