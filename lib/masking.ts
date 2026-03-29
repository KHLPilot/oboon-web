export function maskEmailAddress(value: string | null | undefined): string {
  if (!value) return "";

  const normalized = value.trim();
  const [localPart, domain = ""] = normalized.split("@");

  if (!localPart || !domain) return normalized;
  if (localPart.length <= 2) {
    return `${localPart[0] ?? "*"}*@${domain}`;
  }

  return `${localPart.slice(0, 2)}***@${domain}`;
}
