const EMAIL_DOMAIN_PATTERN = /^[^\s@]+@([a-z0-9.-]+\.[a-z]{2,})$/i;

function normalizeDomain(value: string): string | undefined {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return undefined;
  }

  return trimmed;
}

export function extractSanitizedEmailDomain(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  const angleMatch = trimmed.match(/<([^>]+)>/);
  const candidate = angleMatch?.[1] ?? trimmed;
  const domainMatch = candidate.match(EMAIL_DOMAIN_PATTERN);

  if (!domainMatch?.[1]) {
    return undefined;
  }

  return normalizeDomain(domainMatch[1]);
}

export function extractSanitizedEmailDomains(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  const domains = value
    .split(",")
    .map((part) => extractSanitizedEmailDomain(part))
    .filter((domain): domain is string => domain != null);

  return [...new Set(domains)].sort((left, right) => left.localeCompare(right));
}

export function parseMetadataDateHeader(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Date.parse(value.trim());
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return new Date(parsed).toISOString();
}

export function getHeaderValue(
  headers: Array<{ name?: string; value?: string }> | undefined,
  headerName: string,
): string | undefined {
  if (!headers) {
    return undefined;
  }

  const normalizedName = headerName.toLowerCase();

  for (const header of headers) {
    if (header.name?.toLowerCase() === normalizedName) {
      return header.value;
    }
  }

  return undefined;
}

export function sanitizeGmailLabelIds(labelIds: string[] | undefined): string[] | undefined {
  if (!labelIds || labelIds.length === 0) {
    return undefined;
  }

  const sanitized = [...new Set(labelIds.map((label) => label.trim()).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right),
  );

  return sanitized.length > 0 ? sanitized : undefined;
}
