const TRANSPORT_FORBIDDEN_KEY_PATTERN =
  /^(authorization|apikey|systemprompt|developerprompt|hiddenprompt|toolregistry|allowedcapabilities|executionplan|toolcall|functioncall|command|url|headers|filesystempath)$/i;

export function containsForbiddenLibreChatTransportKey(key: string): boolean {
  return TRANSPORT_FORBIDDEN_KEY_PATTERN.test(key);
}

export function scanLibreChatTransportPayloadForForbiddenKeys(
  value: unknown,
  path = "",
): string[] {
  if (value == null) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry, index) =>
      scanLibreChatTransportPayloadForForbiddenKeys(entry, `${path}[${index}]`),
    );
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const hits: string[] = [];

    for (const [key, nested] of Object.entries(record)) {
      const nextPath = path ? `${path}.${key}` : key;

      if (containsForbiddenLibreChatTransportKey(key)) {
        hits.push(nextPath);
      }

      hits.push(...scanLibreChatTransportPayloadForForbiddenKeys(nested, nextPath));
    }

    return hits;
  }

  return [];
}

export function hasClientAuthorizationHeader(headers: Headers): boolean {
  return headers.has("authorization") || headers.has("Authorization");
}
