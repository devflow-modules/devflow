import { describe, expect, it } from "vitest";
import {
  assertProviderAdapterResultSafe,
  createProviderAdapterSafetyPolicy,
  isProviderAdapterSafetyPolicySafe,
} from "../src/provider-adapter/safety.js";
import type { NangoSandboxCalendarPayload, NangoSandboxGmailPayload } from "../src/nango-adapter/types.js";
import {
  createNangoSandboxAdapter,
  createNangoSandboxSyncRequest,
  mapNangoSandboxPayloadToProviderNormalized,
} from "../src/nango-adapter/sandbox-adapter.js";

const nangoGmailPayload = {
  provider: "gmail",
  id: "nango-sandbox-message-001",
  receivedAt: "2026-06-10T10:00:00.000Z",
  subject: "Recruiter screening scheduled",
  safeSummary: "Recruiter screening signal detected.",
  companyHint: "Acme SaaS Brasil",
  processStageHint: "screening",
  actionRequired: true,
} satisfies NangoSandboxGmailPayload;

const nangoCalendarPayload = {
  provider: "calendar",
  id: "nango-sandbox-event-001",
  eventAt: "2026-06-11T15:00:00.000Z",
  title: "Technical interview",
  safeSummary: "Technical interview signal detected.",
  companyHint: "Acme SaaS Brasil",
  processStageHint: "technical",
  actionRequired: false,
} satisfies NangoSandboxCalendarPayload;

const FORBIDDEN_RESULT_KEYS = [
  "body",
  "description",
  "threadId",
  "messageId",
  "eventId",
  "hangoutLink",
  "htmlLink",
  "attendees",
  "headers",
  "attachments",
  "access_token",
  "refresh_token",
  "providerPayload",
  "raw",
] as const;

const FORBIDDEN_URL_PATTERNS = [
  /zoom\.us/i,
  /teams\.microsoft/i,
  /meet\.google/i,
  /https?:\/\//i,
];

function collectObjectKeys(value: unknown, keys = new Set<string>()): Set<string> {
  if (value === null || typeof value !== "object") {
    return keys;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectObjectKeys(item, keys);
    }
    return keys;
  }
  for (const [key, nested] of Object.entries(value)) {
    keys.add(key);
    collectObjectKeys(nested, keys);
  }
  return keys;
}

describe("mapNangoSandboxPayloadToProviderNormalized", () => {
  it("maps Gmail sandbox payload to ProviderNormalizedMessage", () => {
    const normalized = mapNangoSandboxPayloadToProviderNormalized(nangoGmailPayload);
    expect(normalized.provider).toBe("gmail");
    expect(normalized.id).toBe("adapter-nango-nango-sandbox-message-001");
    expect(normalized.subject).toBe("Recruiter screening scheduled");
    expect(normalized.rawRetained).toBe(false);
  });

  it("maps Calendar sandbox payload to ProviderNormalizedEvent", () => {
    const normalized = mapNangoSandboxPayloadToProviderNormalized(nangoCalendarPayload);
    expect(normalized.provider).toBe("calendar");
    expect(normalized.id).toBe("adapter-nango-nango-sandbox-event-001");
    expect(normalized.title).toBe("Technical interview");
    expect(normalized.rawRetained).toBe(false);
    expect(normalized.meetingLinkRetained).toBe(false);
  });

  it("Gmail normalized does not contain body/threadId/messageId/headers/attachments", () => {
    const normalized = mapNangoSandboxPayloadToProviderNormalized(nangoGmailPayload);
    const keys = Object.keys(normalized);
    expect(keys).not.toContain("body");
    expect(keys).not.toContain("threadId");
    expect(keys).not.toContain("messageId");
    expect(keys).not.toContain("headers");
    expect(keys).not.toContain("attachments");
  });

  it("Calendar normalized does not contain description/hangoutLink/htmlLink/attendees", () => {
    const normalized = mapNangoSandboxPayloadToProviderNormalized(nangoCalendarPayload);
    const keys = Object.keys(normalized);
    expect(keys).not.toContain("description");
    expect(keys).not.toContain("hangoutLink");
    expect(keys).not.toContain("htmlLink");
    expect(keys).not.toContain("attendees");
    expect(normalized.meetingLinkRetained).toBe(false);
  });
});

describe("createNangoSandboxAdapter", () => {
  const requestedAt = "2026-06-12T00:00:00.000Z";
  const mixedPayloads = [
    nangoGmailPayload,
    nangoCalendarPayload,
    {
      ...nangoGmailPayload,
      id: "nango-sandbox-message-002",
      subject: "Follow-up",
    },
  ];

  it("Gmail adapter returns only Gmail payloads", async () => {
    const adapter = createNangoSandboxAdapter({ provider: "gmail", payloads: mixedPayloads });
    const result = await adapter.sync(createNangoSandboxSyncRequest("gmail", requestedAt));
    expect(result.derived.every((item) => item.provider === "gmail")).toBe(true);
    expect(result.derived).toHaveLength(2);
  });

  it("Calendar adapter returns only Calendar payloads", async () => {
    const adapter = createNangoSandboxAdapter({ provider: "calendar", payloads: mixedPayloads });
    const result = await adapter.sync(createNangoSandboxSyncRequest("calendar", requestedAt));
    expect(result.derived.every((item) => item.provider === "calendar")).toBe(true);
    expect(result.derived).toHaveLength(1);
  });

  it("returns runtime sandbox", async () => {
    const adapter = createNangoSandboxAdapter({ provider: "gmail", payloads: [nangoGmailPayload] });
    expect(adapter.runtime).toBe("sandbox");
    const result = await adapter.sync(createNangoSandboxSyncRequest("gmail", requestedAt));
    expect(result.runtime).toBe("sandbox");
  });

  it("returns safe safety policy", async () => {
    const adapter = createNangoSandboxAdapter({ provider: "gmail", payloads: [nangoGmailPayload] });
    const result = await adapter.sync(createNangoSandboxSyncRequest("gmail", requestedAt));
    expect(result.safety).toEqual(createProviderAdapterSafetyPolicy());
    expect(isProviderAdapterSafetyPolicySafe(result.safety)).toBe(true);
  });

  it("result passes assertProviderAdapterResultSafe", async () => {
    const adapter = createNangoSandboxAdapter({ provider: "gmail", payloads: [nangoGmailPayload] });
    const result = await adapter.sync(createNangoSandboxSyncRequest("gmail", requestedAt));
    const safe = assertProviderAdapterResultSafe(result);
    expect(safe.derived).toEqual(result.derived);
  });

  it("does not require token or network", async () => {
    const adapter = createNangoSandboxAdapter({ provider: "gmail", payloads: [nangoGmailPayload] });
    const request = createNangoSandboxSyncRequest("gmail", requestedAt);
    expect(request).not.toHaveProperty("token");
    expect(request).not.toHaveProperty("accessToken");
    await expect(adapter.sync(request)).resolves.toBeDefined();
  });

  it("sorts derived deterministically by id", async () => {
    const adapter = createNangoSandboxAdapter({
      provider: "gmail",
      payloads: [
        { ...nangoGmailPayload, id: "nango-sandbox-message-003" },
        { ...nangoGmailPayload, id: "nango-sandbox-message-001" },
        { ...nangoGmailPayload, id: "nango-sandbox-message-002" },
      ],
    });
    const result = await adapter.sync(createNangoSandboxSyncRequest("gmail", requestedAt));
    const ids = result.derived.map((item) => item.id);
    expect(ids).toEqual([...ids].sort((a, b) => a.localeCompare(b)));
  });

  it("uses request.requestedAt as generatedAt", async () => {
    const adapter = createNangoSandboxAdapter({ provider: "gmail", payloads: [nangoGmailPayload] });
    const result = await adapter.sync(createNangoSandboxSyncRequest("gmail", requestedAt));
    expect(result.generatedAt).toBe(requestedAt);
  });

  it("does not mutate input payloads", async () => {
    const payloads = [structuredClone(nangoGmailPayload)];
    const before = JSON.stringify(payloads);
    const adapter = createNangoSandboxAdapter({ provider: "gmail", payloads });
    await adapter.sync(createNangoSandboxSyncRequest("gmail", requestedAt));
    expect(JSON.stringify(payloads)).toBe(before);
  });

  it("filters mixed payloads by request provider", async () => {
    const adapter = createNangoSandboxAdapter({ provider: "calendar", payloads: mixedPayloads });
    const gmailRequest = createNangoSandboxSyncRequest("gmail", requestedAt);
    const calendarResult = await adapter.sync(createNangoSandboxSyncRequest("calendar", requestedAt));
    const gmailResult = await adapter.sync(gmailRequest);
    expect(calendarResult.derived).toHaveLength(1);
    expect(gmailResult.derived).toHaveLength(0);
  });

  it("result does not contain raw provider payload fields", async () => {
    const adapter = createNangoSandboxAdapter({ provider: "gmail", payloads: [nangoGmailPayload] });
    const result = await adapter.sync(createNangoSandboxSyncRequest("gmail", requestedAt));
    const keys = collectObjectKeys(result);
    for (const forbidden of FORBIDDEN_RESULT_KEYS) {
      expect(keys.has(forbidden)).toBe(false);
    }
  });

  it("JSON result has no forbidden keys or meeting URLs", async () => {
    const adapter = createNangoSandboxAdapter({
      provider: "calendar",
      payloads: [nangoCalendarPayload],
    });
    const result = await adapter.sync(createNangoSandboxSyncRequest("calendar", requestedAt));
    const json = JSON.stringify(result);
    const keys = collectObjectKeys(JSON.parse(json));
    for (const forbidden of FORBIDDEN_RESULT_KEYS) {
      expect(keys.has(forbidden)).toBe(false);
    }
    for (const pattern of FORBIDDEN_URL_PATTERNS) {
      expect(json).not.toMatch(pattern);
    }
    expect(keys.has("meetingLinksRetained")).toBe(true);
  });
});
