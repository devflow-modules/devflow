import { describe, expect, it, vi } from "vitest";
import {
  createGmailReadOnlyAdapterRequest,
  isGmailReadOnlyAdapterResultSafe,
} from "@devflow/career-sync";
import { createGmailReadOnlyNangoRuntimeAdapter } from "./gmail-readonly-nango-adapter.js";
import type { GmailNangoRuntimeMetadataProvider } from "./gmail-readonly-nango-provider.js";

const requestedAt = "2026-06-15T12:00:00.000Z";

function nangoRequest() {
  return createGmailReadOnlyAdapterRequest({
    runtime: "nango",
    connectionVerified: true,
    requestedAt,
  });
}

describe("createGmailReadOnlyNangoRuntimeAdapter", () => {
  it("blocks non-nango runtime", async () => {
    const provider: GmailNangoRuntimeMetadataProvider = {
      listMessageMetadata: vi.fn(async () => []),
    };
    const adapter = createGmailReadOnlyNangoRuntimeAdapter({ metadataProvider: provider });

    const result = await adapter.execute(
      createGmailReadOnlyAdapterRequest({
        runtime: "sandbox",
        connectionVerified: true,
        requestedAt,
      }),
    );

    expect(result.status).toBe("blocked");
    expect(provider.listMessageMetadata).not.toHaveBeenCalled();
  });

  it("blocks unverified connection", async () => {
    const provider: GmailNangoRuntimeMetadataProvider = {
      listMessageMetadata: vi.fn(async () => []),
    };
    const adapter = createGmailReadOnlyNangoRuntimeAdapter({ metadataProvider: provider });

    const result = await adapter.execute(
      createGmailReadOnlyAdapterRequest({
        runtime: "nango",
        connectionVerified: false,
        requestedAt,
      }),
    );

    expect(result.status).toBe("blocked");
    expect(provider.listMessageMetadata).not.toHaveBeenCalled();
  });

  it("completes with factual provider_email_activity signals for valid metadata", async () => {
    const provider: GmailNangoRuntimeMetadataProvider = {
      listMessageMetadata: vi.fn(async () => [
        {
          occurredAt: "2026-06-20T14:00:00.000Z",
          direction: "inbound",
          senderDomain: "jobs.example",
          recipientDomains: ["candidate.example"],
          hasAttachment: false,
          labels: ["INBOX"],
        },
      ]),
    };
    const adapter = createGmailReadOnlyNangoRuntimeAdapter({ metadataProvider: provider });

    const result = await adapter.execute(nangoRequest());

    expect(result.status).toBe("completed");
    expect(result.processedMessageCount).toBe(1);
    expect(result.signals).toHaveLength(1);
    expect(result.signals[0]?.kind).toBe("provider_email_activity");
    expect(result.importedRawMessages).toBe(false);
    expect(result.retainedBodies).toBe(false);
    expect(result.retainedSnippets).toBe(false);
    expect(result.hasToken).toBe(false);
    expect(result.userReviewRequired).toBe(true);
    expect(isGmailReadOnlyAdapterResultSafe(result)).toBe(true);
    expect(result.messages[0]).toMatch(/No raw message content was retained/i);
  });

  it("returns sanitized error when provider fails", async () => {
    const provider: GmailNangoRuntimeMetadataProvider = {
      listMessageMetadata: vi.fn(async () => {
        throw new Error("gmail failure access_token snippet body");
      }),
    };
    const adapter = createGmailReadOnlyNangoRuntimeAdapter({ metadataProvider: provider });

    const result = await adapter.execute(nangoRequest());

    expect(result.status).toBe("error");
    expect(result.signals).toEqual([]);
    expect(result.messages).toContain("Gmail read-only runtime processing failed safely.");
    expect(JSON.stringify(result)).not.toMatch(/access_token/i);
    expect(JSON.stringify(result)).not.toMatch(/"snippet"/i);
    expect(JSON.stringify(result)).not.toMatch(/"body"/i);
  });

  it("reports processedMessageCount for five provider messages", async () => {
    const provider: GmailNangoRuntimeMetadataProvider = {
      listMessageMetadata: vi.fn(async () =>
        Array.from({ length: 5 }, (_, index) => ({
          occurredAt: `2026-06-16T1${index}:00:00.000Z`,
          direction: "unknown" as const,
          senderDomain: "demo.example",
          recipientDomains: ["candidate.example"],
          hasAttachment: false,
          labels: ["INBOX"],
        })),
      ),
    };
    const adapter = createGmailReadOnlyNangoRuntimeAdapter({ metadataProvider: provider });

    const result = await adapter.execute(nangoRequest());

    expect(result.status).toBe("completed");
    expect(result.processedMessageCount).toBe(5);
    expect(result.signals).toHaveLength(5);
  });

  it("does not expose forbidden fields in completed result", async () => {
    const provider: GmailNangoRuntimeMetadataProvider = {
      listMessageMetadata: vi.fn(async () => [
        {
          occurredAt: "2026-06-20T14:00:00.000Z",
          direction: "unknown",
          senderDomain: "acme.example",
          recipientDomains: ["candidate.example"],
          hasAttachment: false,
        },
      ]),
    };
    const adapter = createGmailReadOnlyNangoRuntimeAdapter({ metadataProvider: provider });
    const result = await adapter.execute(nangoRequest());
    const serialized = JSON.stringify(result);

    expect(serialized).not.toMatch(/"subject"/i);
    expect(serialized).not.toMatch(/"snippet"/i);
    expect(serialized).not.toMatch(/"body"/i);
    expect(serialized).not.toMatch(/messageId/i);
    expect(serialized).not.toMatch(/threadId/i);
    expect(serialized).not.toMatch(/access_token/i);
    expect(serialized).not.toMatch(/refresh_token/i);
    expect(serialized).not.toMatch(/client_secret/i);
    expect(serialized).not.toMatch(/"providerPayload"/i);
  });
});
