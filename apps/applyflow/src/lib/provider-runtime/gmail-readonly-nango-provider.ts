// Server-only Gmail read-only Nango metadata provider.
// Do not import this file from client components.

import { Nango } from "@nangohq/node";
import type { GmailEphemeralMessageMetadata } from "@devflow/career-sync";
import {
  buildApplyFlowNangoEndUserId,
  NANGO_INTEGRATION_BY_PROVIDER,
} from "./nango-server-provider.js";
import {
  extractSanitizedEmailDomain,
  extractSanitizedEmailDomains,
  getHeaderValue,
  parseMetadataDateHeader,
  sanitizeGmailLabelIds,
} from "./gmail-runtime-normalization.js";

export const GMAIL_RUNTIME_INTEGRATION_ID = NANGO_INTEGRATION_BY_PROVIDER.gmail;
export const GMAIL_MESSAGES_LIST_ENDPOINT = "/gmail/v1/users/me/messages";
export const GMAIL_MESSAGE_METADATA_FORMAT = "metadata" as const;
export const GMAIL_MESSAGE_METADATA_HEADERS = ["From", "To", "Date"] as const;

export type GmailNangoRuntimeMetadataProvider = {
  listMessageMetadata(input: {
    from?: string;
    to?: string;
    limit: number;
  }): Promise<GmailEphemeralMessageMetadata[]>;
};

export type GmailNangoRuntimeSdk = {
  listConnections(input: {
    integrationId: string;
    tags: Record<string, string>;
    limit: number;
  }): Promise<{ connections?: Array<Record<string, unknown>> }>;
  get<T>(config: {
    endpoint: string;
    providerConfigKey: string;
    connectionId: string;
    params?: Record<string, string | number | string[]>;
  }): Promise<{ data: T }>;
};

type GmailMessagesListResponse = {
  messages?: Array<{ id?: string }>;
};

type GmailMessageMetadataResponse = {
  id?: string;
  threadId?: string;
  snippet?: string;
  labelIds?: string[];
  payload?: {
    headers?: Array<{ name?: string; value?: string }>;
    parts?: unknown[];
  };
};

function resolveNangoConnectionId(connection: Record<string, unknown> | undefined): string | undefined {
  if (!connection) {
    return undefined;
  }

  const candidate = connection.connection_id ?? connection.connectionId;

  return typeof candidate === "string" && candidate.trim().length > 0 ? candidate.trim() : undefined;
}

function buildMessageMetadataEndpoint(messageId: string): string {
  return `/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}`;
}

function filterMetadataByWindow(
  metadata: GmailEphemeralMessageMetadata[],
  from?: string,
  to?: string,
): GmailEphemeralMessageMetadata[] {
  return metadata.filter((item) => {
    const occurredAt = Date.parse(item.occurredAt);
    if (!Number.isFinite(occurredAt)) {
      return false;
    }

    if (from != null && occurredAt < Date.parse(from)) {
      return false;
    }

    if (to != null && occurredAt > Date.parse(to)) {
      return false;
    }

    return true;
  });
}

function cloneMetadata(item: GmailEphemeralMessageMetadata): GmailEphemeralMessageMetadata {
  return {
    ...item,
    recipientDomains: [...item.recipientDomains],
    labels: item.labels ? [...item.labels] : undefined,
  };
}

function normalizeGmailMessageMetadata(
  response: GmailMessageMetadataResponse,
): GmailEphemeralMessageMetadata | null {
  const headers = response.payload?.headers;
  const occurredAt = parseMetadataDateHeader(getHeaderValue(headers, "Date"));

  if (!occurredAt) {
    return null;
  }

  const senderDomain = extractSanitizedEmailDomain(getHeaderValue(headers, "From"));
  const recipientDomains = extractSanitizedEmailDomains(getHeaderValue(headers, "To"));

  return {
    occurredAt,
    direction: "unknown",
    senderDomain,
    recipientDomains,
    hasAttachment: false,
    labels: sanitizeGmailLabelIds(response.labelIds),
  };
}

export function createGmailNangoRuntimeSdk(secretKey: string): GmailNangoRuntimeSdk {
  const nango = new Nango({ secretKey });

  return {
    listConnections: (input) => nango.listConnections(input),
    get: (config) => nango.get(config),
  };
}

export function createGmailNangoRuntimeMetadataProvider(input: {
  secretKey: string;
  endUserId?: string;
  sdk?: GmailNangoRuntimeSdk;
}): GmailNangoRuntimeMetadataProvider {
  const endUserId = input.endUserId ?? buildApplyFlowNangoEndUserId("gmail");
  const sdk = input.sdk ?? createGmailNangoRuntimeSdk(input.secretKey);

  return {
    async listMessageMetadata(request) {
      const { connections } = await sdk.listConnections({
        integrationId: GMAIL_RUNTIME_INTEGRATION_ID,
        tags: { end_user_id: endUserId },
        limit: 1,
      });

      const connectionId = resolveNangoConnectionId(connections?.[0]);

      if (!connectionId) {
        return [];
      }

      const maxResults = Math.max(1, Math.min(request.limit, 50));

      const listResponse = await sdk.get<GmailMessagesListResponse>({
        providerConfigKey: GMAIL_RUNTIME_INTEGRATION_ID,
        connectionId,
        endpoint: GMAIL_MESSAGES_LIST_ENDPOINT,
        params: {
          maxResults,
        },
      });

      const messageIds = (listResponse.data.messages ?? [])
        .map((message) => message.id)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
        .slice(0, maxResults);

      const metadata: GmailEphemeralMessageMetadata[] = [];

      for (const ephemeralMessageId of messageIds) {
        const detailResponse = await sdk.get<GmailMessageMetadataResponse>({
          providerConfigKey: GMAIL_RUNTIME_INTEGRATION_ID,
          connectionId,
          endpoint: buildMessageMetadataEndpoint(ephemeralMessageId),
          params: {
            format: GMAIL_MESSAGE_METADATA_FORMAT,
            metadataHeaders: [...GMAIL_MESSAGE_METADATA_HEADERS],
          },
        });

        const normalized = normalizeGmailMessageMetadata(detailResponse.data);

        if (normalized) {
          metadata.push(normalized);
        }
      }

      const filtered = filterMetadataByWindow(metadata, request.from, request.to);
      const sorted = [...filtered].sort((left, right) => left.occurredAt.localeCompare(right.occurredAt));

      return sorted.slice(0, maxResults).map(cloneMetadata);
    },
  };
}
