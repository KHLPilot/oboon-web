function isInvalidToken(value: string): boolean {
  const lowered = value.trim().toLowerCase();
  return (
    lowered === "" ||
    lowered === "null" ||
    lowered === "undefined" ||
    lowered === "nan"
  );
}

export function normalizeImageUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const url = value.trim();
  if (isInvalidToken(url)) return null;

  const isAllowed =
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("//") ||
    url.startsWith("data:image/") ||
    url.startsWith("blob:") ||
    url.startsWith("/");

  return isAllowed ? url : null;
}

export const DEFAULT_AVATAR_URL = "/images/default-avatar.png";

export function normalizeAvatarUrl(value: unknown): string | null {
  const normalized = normalizeImageUrl(value);
  if (!normalized) return null;

  if (normalized.startsWith("//")) {
    return `https:${normalized}`;
  }

  if (normalized.startsWith("http://")) {
    try {
      const parsed = new URL(normalized);
      parsed.protocol = "https:";
      return parsed.toString();
    } catch {
      return null;
    }
  }

  return normalized;
}

export function getAvatarUrlOrDefault(value: unknown): string {
  return normalizeAvatarUrl(value) ?? DEFAULT_AVATAR_URL;
}
