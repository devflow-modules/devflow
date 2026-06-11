export function normalizeText(value: string | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

export function normalizeLower(value: string | undefined): string {
  return normalizeText(value).toLowerCase();
}

export function combineText(parts: Array<string | undefined>): string {
  return parts.map((p) => normalizeText(p)).filter(Boolean).join(" ");
}

export function extractEmailDomain(from: string | undefined): string | undefined {
  const text = normalizeText(from);
  if (!text) return undefined;
  const match = text.match(/@([\w.-]+\.\w+)/);
  return match?.[1]?.toLowerCase();
}

export function companyHintFromDomain(domain: string | undefined): string | undefined {
  if (!domain) return undefined;
  const blocked = new Set(["gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "yahoo.com", "icloud.com"]);
  if (blocked.has(domain)) return undefined;
  const base = domain.split(".")[0];
  if (!base || base.length < 2) return undefined;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

export function buildSignalId(source: string, providerId: string): string {
  return `${source}:${providerId}`;
}
