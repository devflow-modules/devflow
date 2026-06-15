import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createGmailNangoRuntimeMetadataProvider,
  GMAIL_MESSAGE_METADATA_FORMAT,
  GMAIL_MESSAGE_METADATA_HEADERS,
  GMAIL_MESSAGES_LIST_ENDPOINT,
  GMAIL_RUNTIME_INTEGRATION_ID,
  type GmailNangoRuntimeSdk,
} from "./gmail-readonly-nango-provider.js";

const listConnections = vi.fn();
const get = vi.fn();

const sdk: GmailNangoRuntimeSdk = {
  listConnections,
  get,
};

describe("createGmailNangoRuntimeMetadataProvider", () => {
  beforeEach(() => {
    listConnections.mockReset();
    get.mockReset();
  });

  it("uses google-mail integration and metadata format", async () => {
    listConnections.mockResolvedValue({
      connections: [{ connection_id: "conn-1" }],
    });
    get
      .mockResolvedValueOnce({
        data: {
          messages: [{ id: "msg-1" }],
        },
      })
      .mockResolvedValueOnce({
        data: {
          id: "msg-1",
          threadId: "thread-1",
          snippet: "secret snippet should be ignored",
          labelIds: ["INBOX"],
          payload: {
            headers: [
              { name: "From", value: "Recruiter <recruiter@jobs.example>" },
              { name: "To", value: "Candidate <candidate@candidate.example>" },
              { name: "Date", value: "Fri, 20 Jun 2026 14:00:00 +0000" },
              { name: "Subject", value: "Interview invitation" },
            ],
            parts: [{ filename: "resume.pdf", body: { attachmentId: "att-1" } }],
          },
        },
      });

    const provider = createGmailNangoRuntimeMetadataProvider({
      secretKey: "test-secret",
      endUserId: "applyflow-gmail-runtime-boundary",
      sdk,
    });

    const metadata = await provider.listMessageMetadata({ limit: 5 });

    expect(listConnections).toHaveBeenCalledWith({
      integrationId: GMAIL_RUNTIME_INTEGRATION_ID,
      tags: { end_user_id: "applyflow-gmail-runtime-boundary" },
      limit: 1,
    });
    expect(get).toHaveBeenNthCalledWith(1, {
      providerConfigKey: GMAIL_RUNTIME_INTEGRATION_ID,
      connectionId: "conn-1",
      endpoint: GMAIL_MESSAGES_LIST_ENDPOINT,
      params: { maxResults: 5 },
    });
    expect(get).toHaveBeenNthCalledWith(2, {
      providerConfigKey: GMAIL_RUNTIME_INTEGRATION_ID,
      connectionId: "conn-1",
      endpoint: "/gmail/v1/users/me/messages/msg-1",
      params: {
        format: GMAIL_MESSAGE_METADATA_FORMAT,
        metadataHeaders: [...GMAIL_MESSAGE_METADATA_HEADERS],
      },
    });

    expect(metadata).toHaveLength(1);
    expect(metadata[0]).toEqual({
      occurredAt: "2026-06-20T14:00:00.000Z",
      direction: "unknown",
      senderDomain: "jobs.example",
      recipientDomains: ["candidate.example"],
      hasAttachment: false,
      labels: ["INBOX"],
    });

    const serialized = JSON.stringify(metadata);
    expect(serialized).not.toMatch(/msg-1|thread-1|"snippet"|"subject"|access_token/i);
    expect(metadata[0]).not.toHaveProperty("messageId");
    expect(metadata[0]).not.toHaveProperty("threadId");
  });

  it("limits results and applies from/to window in memory", async () => {
    listConnections.mockResolvedValue({
      connections: [{ connection_id: "conn-1" }],
    });
    get
      .mockResolvedValueOnce({
        data: {
          messages: [{ id: "msg-1" }, { id: "msg-2" }],
        },
      })
      .mockResolvedValueOnce({
        data: {
          payload: {
            headers: [
              { name: "From", value: "a@acme.example" },
              { name: "Date", value: "Fri, 19 Jun 2026 14:00:00 +0000" },
            ],
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          payload: {
            headers: [
              { name: "From", value: "b@beta.example" },
              { name: "Date", value: "Fri, 21 Jun 2026 14:00:00 +0000" },
            ],
          },
        },
      });

    const provider = createGmailNangoRuntimeMetadataProvider({
      secretKey: "test-secret",
      sdk,
    });

    const metadata = await provider.listMessageMetadata({
      from: "2026-06-20T00:00:00.000Z",
      to: "2026-06-22T00:00:00.000Z",
      limit: 10,
    });

    expect(metadata).toHaveLength(1);
    expect(metadata[0]?.senderDomain).toBe("beta.example");
  });

  it("returns empty metadata when no connection exists", async () => {
    listConnections.mockResolvedValue({ connections: [] });

    const provider = createGmailNangoRuntimeMetadataProvider({
      secretKey: "test-secret",
      sdk,
    });

    const metadata = await provider.listMessageMetadata({ limit: 3 });

    expect(metadata).toEqual([]);
    expect(get).not.toHaveBeenCalled();
  });
});
