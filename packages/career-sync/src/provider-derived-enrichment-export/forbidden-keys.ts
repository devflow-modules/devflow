export const PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_FORBIDDEN_KEYS = new Set([
  "access_token",
  "refresh_token",
  "client_secret",
  "authorization_code",
  "connectionId",
  "end_user_id",
  "providerPayload",
  "providerId",
  "rawPayload",
  "messageId",
  "threadId",
  "eventId",
  "calendarId",
  "subject",
  "snippet",
  "body",
  "description",
  "location",
  "meetingLink",
  "attendeeEmail",
  "organizerEmail",
  "rawMessage",
  "rawEvent",
]);

export function collectForbiddenKeysInDocument(value: unknown): string[] {
  const found: string[] = [];

  function walk(node: unknown): void {
    if (node == null || typeof node !== "object") {
      return;
    }

    if (Array.isArray(node)) {
      for (const entry of node) {
        walk(entry);
      }
      return;
    }

    for (const [key, child] of Object.entries(node as Record<string, unknown>)) {
      if (PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_FORBIDDEN_KEYS.has(key)) {
        found.push(key);
      }
      walk(child);
    }
  }

  walk(value);
  return [...new Set(found)].sort((left, right) => left.localeCompare(right));
}

export function hasForbiddenKeysInDocument(value: unknown): boolean {
  return collectForbiddenKeysInDocument(value).length > 0;
}
