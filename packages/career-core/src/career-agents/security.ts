const FORBIDDEN_KEY_PATTERN =
  /access_token|refresh_token|client_secret|nango_secret_key|authorization|connectionid|connection_id|messageid|message_id|threadid|thread_id|eventid|event_id|^subject$|^snippet$|^body$|^description$|^location$|meetinglink|meeting_link|attendee/i;

const FORBIDDEN_VALUE_PATTERN =
  /Bearer\s+[A-Za-z0-9._-]+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/i;

export function containsForbiddenCareerAgentKey(key: string): boolean {
  return FORBIDDEN_KEY_PATTERN.test(key);
}

export function scanCareerAgentPayloadForForbiddenKeys(value: unknown, path = ""): string[] {
  if (value == null) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => scanCareerAgentPayloadForForbiddenKeys(entry, `${path}[${index}]`));
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const hits: string[] = [];

    for (const [key, nested] of Object.entries(record)) {
      const nextPath = path ? `${path}.${key}` : key;
      if (containsForbiddenCareerAgentKey(key)) {
        hits.push(nextPath);
      }
      hits.push(...scanCareerAgentPayloadForForbiddenKeys(nested, nextPath));
    }

    return hits;
  }

  if (typeof value === "string" && FORBIDDEN_VALUE_PATTERN.test(value)) {
    return [path || "value"];
  }

  return [];
}

export function isCareerAgentContextSafe(value: unknown): boolean {
  if (value == null || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;

  if (record.hasToken === true) {
    return false;
  }

  if (record.rawProviderData === true) {
    return false;
  }

  return scanCareerAgentPayloadForForbiddenKeys(value).length === 0;
}
