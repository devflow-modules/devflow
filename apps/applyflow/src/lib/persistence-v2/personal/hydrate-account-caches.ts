import { APPLYFLOW_DASHBOARD_ANALYTICS_STORAGE_KEY } from "@/lib/local-analytics-storage";
import { APPLYFLOW_DASHBOARD_CONTACTS_STORAGE_KEY } from "@/lib/local-contact-storage";
import { APPLYFLOW_INBOUND_RESPONSES_STORAGE_KEY } from "@/lib/local-inbound-response-storage";
import { APPLYFLOW_RESUME_LIBRARY_STORAGE_KEY } from "@/lib/local-resume-library-storage";
import type { Contact, ContactInteraction, ResponseDetection } from "@devflow/applyflow-core";

import {
  beginPersonalRequest,
  isStalePersonalGeneration,
  rememberContactVersion,
  rememberResponseVersion,
  writeAccountScopedCache,
} from "./client-scope";

export function careerEventsFromAnalyticsPayload(events: readonly unknown[]): unknown[] {
  return events.filter((event) => {
    if (!event || typeof event !== "object" || Array.isArray(event)) return false;
    const row = event as Record<string, unknown>;
    return (
      typeof row.id === "string" &&
      typeof row.applicationId === "string" &&
      typeof row.type === "string" &&
      typeof row.occurredAt === "string"
    );
  });
}

/**
 * Fills account-scoped caches from the authenticated personal APIs.
 * Does not read or write legacy anonymous keys and does not invent outcomes.
 */
export async function hydrateAccountPersonalCaches(generation: number): Promise<boolean> {
  if (isStalePersonalGeneration(generation)) return false;
  const request = beginPersonalRequest();
  if (request.generation !== generation) return false;
  let contactsResponse: Response;
  let responsesResponse: Response;
  let analyticsResponse: Response;
  let profileResponse: Response;
  try {
    [contactsResponse, responsesResponse, analyticsResponse, profileResponse] = await Promise.all([
      fetch("/api/applyflow/v2/contacts", {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        signal: request.signal,
      }),
      fetch("/api/applyflow/v2/responses", {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        signal: request.signal,
      }),
      fetch("/api/applyflow/v2/analytics", {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        signal: request.signal,
      }),
      fetch("/api/applyflow/v2/profile", {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        signal: request.signal,
      }),
    ]);
  } catch {
    return false;
  }
  if (isStalePersonalGeneration(generation) || request.signal.aborted) return false;
  if (!contactsResponse.ok || !responsesResponse.ok || !analyticsResponse.ok || !profileResponse.ok) return false;

  const contactsBody = (await contactsResponse.json()) as {
    contacts?: Contact[];
    interactions?: ContactInteraction[];
    versions?: Record<string, number>;
  };
  const responsesBody = (await responsesResponse.json()) as {
    responses?: Array<{ detection?: ResponseDetection; version?: number }>;
  };
  const analyticsBody = (await analyticsResponse.json()) as { events?: unknown[] };
  const profileBody = (await profileResponse.json()) as { profile?: { library?: unknown } | null };
  if (isStalePersonalGeneration(generation)) return false;
  if (profileBody.profile?.library) {
    writeAccountScopedCache(APPLYFLOW_RESUME_LIBRARY_STORAGE_KEY, JSON.stringify(profileBody.profile.library));
  }

  const savedAt = new Date().toISOString();
  writeAccountScopedCache(
    APPLYFLOW_DASHBOARD_CONTACTS_STORAGE_KEY,
    JSON.stringify({
      version: 1,
      savedAt,
      contacts: contactsBody.contacts ?? [],
      interactions: contactsBody.interactions ?? [],
    }),
  );
  for (const [id, version] of Object.entries(contactsBody.versions ?? {})) {
    if (typeof version === "number") rememberContactVersion(id, version);
  }

  const detections: ResponseDetection[] = [];
  for (const item of responsesBody.responses ?? []) {
    if (!item.detection) continue;
    detections.push(item.detection);
    if (typeof item.version === "number") rememberResponseVersion(item.detection.id, item.version);
  }
  writeAccountScopedCache(
    APPLYFLOW_INBOUND_RESPONSES_STORAGE_KEY,
    JSON.stringify({ version: 1, savedAt, detections }),
  );

  writeAccountScopedCache(
    APPLYFLOW_DASHBOARD_ANALYTICS_STORAGE_KEY,
    JSON.stringify({
      version: 1,
      savedAt,
      outcomes: [],
      events: careerEventsFromAnalyticsPayload(analyticsBody.events ?? []),
      efforts: [],
    }),
  );
  return true;
}
