export function normalizeImageUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const url = value.trim();
  if (!url) return null;

  const isAllowed =
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:image/") ||
    url.startsWith("blob:") ||
    url.startsWith("/");

  return isAllowed ? url : null;
}

export const DEFAULT_AVATAR_URL = "/images/default-avatar.png";

export function getAvatarUrlOrDefault(value: unknown): string {
  return normalizeImageUrl(value) ?? DEFAULT_AVATAR_URL;
}
