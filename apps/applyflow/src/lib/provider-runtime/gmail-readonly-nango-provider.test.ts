import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildGmailMessageMetadataRequestParams,
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

describe("buildGmailMessageMetadataRequestParams", () => {
  it("serializes metadataHeaders as repeated query params", () => {
    const params = new URLSearchParams(buildGmailMessageMetadataRequestParams());

    expect(params.get("format")).toBe(GMAIL_MESSAGE_METADATA_FORMAT);
    expect(params.getAll("metadataHeaders")).toEqual([...GMAIL_MESSAGE_METADATA_HEADERS]);
    expect(buildGmailMessageMetadataRequestParams()).not.toContain(",");
  });

  it("avoids Nango array coercion to a single comma-separated metadataHeaders value", () => {
    const coerced = new URL("https://proxy.example/proxy");
    coerced.searchParams.set("metadataHeaders", [...GMAIL_MESSAGE_METADATA_HEADERS]);

    expect(coerced.searchParams.getAll("metadataHeaders")).toEqual(["From,To,Date"]);

    const repeated = new URL(`https://proxy.example/proxy?${buildGmailMessageMetadataRequestParams()}`);
    expect(repeated.searchParams.getAll("metadataHeaders")).toEqual([...GMAIL_MESSAGE_METADATA_HEADERS]);
  });
});

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
      params: buildGmailMessageMetadataRequestParams(),
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

  it("normalizes five listed messages and preserves inclusive window boundaries", async () => {
    listConnections.mockResolvedValue({
      connections: [{ connection_id: "conn-1" }],
    });

    const messageIds = ["msg-1", "msg-2", "msg-3", "msg-4", "msg-5"];
    const dates = [
      "Mon, 16 Jun 2026 09:00:00 -0300",
      "Mon, 16 Jun 2026 10:00:00 -0300",
      "Mon, 16 Jun 2026 11:00:00 -0300",
      "Mon, 16 Jun 2026 12:00:00 -0300",
      "Mon, 16 Jun 2026 13:00:00 -0300",
    ];

    get.mockResolvedValueOnce({
      data: {
        messages: messageIds.map((id) => ({ id })),
        resultSizeEstimate: 5,
      },
    });

    for (let index = 0; index < messageIds.length; index += 1) {
      get.mockResolvedValueOnce({
        data: {
          payload: {
            headers: [
              { name: "From", value: "noreply+demo@example.invalid" },
              { name: "To", value: "candidate@example.invalid" },
              { name: "Date", value: dates[index] },
            ],
          },
        },
      });
    }

    const provider = createGmailNangoRuntimeMetadataProvider({
      secretKey: "test-secret",
      sdk,
    });

    const metadata = await provider.listMessageMetadata({
      from: "2026-06-16T12:00:00.000Z",
      to: "2026-06-16T13:00:00.000Z",
      limit: 10,
    });

    expect(get).toHaveBeenCalledTimes(6);
    expect(metadata).toHaveLength(2);
    expect(metadata.map((item) => item.occurredAt)).toEqual([
      "2026-06-16T12:00:00.000Z",
      "2026-06-16T13:00:00.000Z",
    ]);

    const serialized = JSON.stringify(metadata);
    expect(serialized).not.toMatch(/msg-|thread-|access_token|refresh_token|"subject"|"snippet"/i);
  });

  it("rejects metadata without a valid Date header", async () => {
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
          payload: {
            headers: [{ name: "From", value: "noreply+demo@example.invalid" }],
          },
        },
      });

    const provider = createGmailNangoRuntimeMetadataProvider({
      secretKey: "test-secret",
      sdk,
    });

    const metadata = await provider.listMessageMetadata({ limit: 5 });

    expect(metadata).toEqual([]);
  });

  it("drops messages outside the requested window", async () => {
    listConnections.mockResolvedValue({
      connections: [{ connection_id: "conn-1" }],
    });
    get
      .mockResolvedValueOnce({
        data: {
          messages: [{ id: "msg-early" }, { id: "msg-late" }],
        },
      })
      .mockResolvedValueOnce({
        data: {
          payload: {
            headers: [
              { name: "From", value: "a@acme.example" },
              { name: "Date", value: "Sun, 15 Jun 2026 12:00:00 +0000" },
            ],
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          payload: {
            headers: [
              { name: "From", value: "b@beta.example" },
              { name: "Date", value: "Wed, 18 Jun 2026 12:00:00 +0000" },
            ],
          },
        },
      });

    const provider = createGmailNangoRuntimeMetadataProvider({
      secretKey: "test-secret",
      sdk,
    });

    const metadata = await provider.listMessageMetadata({
      from: "2026-06-16T00:00:00.000Z",
      to: "2026-06-17T00:00:00.000Z",
      limit: 10,
    });

    expect(metadata).toEqual([]);
  });
});
