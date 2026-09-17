// Server-only Gmail read-only Nango metadata provider.
// Do not import this file from client components.

import { createHash } from "node:crypto";
import { Nango } from "@nangohq/node";
import type { GmailEphemeralMessageMetadata } from "@devflow/career-sync";
import {
  NANGO_INTEGRATION_BY_PROVIDER,
} from "./nango-server-provider";
import {
  extractSanitizedEmailDomain,
  extractSanitizedEmailDomains,
  getHeaderValue,
  parseMetadataDateHeader,
  sanitizeGmailLabelIds,
} from "./gmail-runtime-normalization";

export const GMAIL_RUNTIME_INTEGRATION_ID = NANGO_INTEGRATION_BY_PROVIDER.gmail;
export const GMAIL_MESSAGES_LIST_ENDPOINT = "/gmail/v1/users/me/messages";
export const GMAIL_MESSAGE_METADATA_FORMAT = "metadata" as const;
export const GMAIL_MESSAGE_METADATA_HEADERS = ["From", "To", "Date"] as const;
export const GMAIL_CLOSED_LOOP_METADATA_HEADERS = ["From", "To", "Date", "Subject"] as const;

export type GmailClosedLoopInboundEmail = {
  id: string;
  receivedAt: string;
  senderDomain?: string;
  subject?: string;
  snippet?: string;
  labels?: string[];
  accountScope: string;
  legacyId: string;
};

export type GmailClosedLoopInboundList = {
  accountScopes: string[];
  emails: GmailClosedLoopInboundEmail[];
  needsAccountSelection: boolean;
  selectedAccountScope?: string;
};

/**
 * Gmail expects repeated `metadataHeaders` query params. Nango's proxy serializes
 * object params with `URLSearchParams.set`, which coerces arrays to a single
 * comma-separated value and prevents Date/From/To from being returned.
 */
function buildMetadataRequestParams(headers: readonly string[]): string {
  const params = new URLSearchParams();
  params.set("format", GMAIL_MESSAGE_METADATA_FORMAT);
  for (const header of headers) {
    params.append("metadataHeaders", header);
  }
  return params.toString();
}

export function buildGmailMessageMetadataRequestParams(): string {
  return buildMetadataRequestParams(GMAIL_MESSAGE_METADATA_HEADERS);
}

export function buildGmailClosedLoopMetadataRequestParams(): string {
  return buildMetadataRequestParams(GMAIL_CLOSED_LOOP_METADATA_HEADERS);
}

/**
 * Hashed Gmail/Nango connection identity. Never pass the raw connection id to the client.
 */
export function hashClosedLoopAccountScope(connectionId: string): string {
  return createHash("sha256").update(`applyflow-closed-loop-account-v1:${connectionId}`).digest("hex").slice(0, 32);
}

/**
 * Inbound dedupe identity.
 * New emails include the hashed account scope. Omitting accountScope keeps the
 * legacy message-only hash so already stored detections can be reused in place.
 */
export function hashClosedLoopEmailId(messageId: string, accountScope?: string): string {
  const material = accountScope
    ? `applyflow-closed-loop-v1:${accountScope}:${messageId}`
    : `applyflow-closed-loop-v1:${messageId}`;
  return createHash("sha256").update(material).digest("hex").slice(0, 32);
}

export type GmailNangoRuntimeMetadataProvider = {
  listMessageMetadata(input: {
    from?: string;
    to?: string;
    limit: number;
  }): Promise<GmailEphemeralMessageMetadata[]>;
  listInboundEmails?(input: {
    from?: string;
    to?: string;
    limit: number;
    accountScope?: string;
  }): Promise<GmailClosedLoopInboundList>;
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
    params?: Record<string, string | number | string[]> | string;
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

function redactPersonalText(value: string | undefined, max: number): string | undefined {
  const trimmed = value?.replace(/\s+/g, " ").trim();
  if (!trimmed) {
    return undefined;
  }
  const redacted = trimmed.replace(/[^\s@]+@[^\s@]+/g, "[email]");
  return redacted.length > max ? `${redacted.slice(0, max - 1)}…` : redacted;
}

function normalizeClosedLoopInboundEmail(
  response: GmailMessageMetadataResponse,
  rawMessageId: string,
  accountScope: string,
): GmailClosedLoopInboundEmail | null {
  const labels = sanitizeGmailLabelIds(response.labelIds);
  if (labels?.includes("SENT") && !labels.includes("INBOX")) {
    return null;
  }

  const headers = response.payload?.headers;
  const receivedAt = parseMetadataDateHeader(getHeaderValue(headers, "Date"));
  if (!receivedAt) {
    return null;
  }

  return {
    id: hashClosedLoopEmailId(rawMessageId, accountScope),
    legacyId: hashClosedLoopEmailId(rawMessageId),
    accountScope,
    receivedAt,
    senderDomain: extractSanitizedEmailDomain(getHeaderValue(headers, "From")),
    subject: redactPersonalText(getHeaderValue(headers, "Subject"), 180),
    snippet: redactPersonalText(response.snippet, 240),
    labels,
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
  endUserId: string;
  sdk?: GmailNangoRuntimeSdk;
}): GmailNangoRuntimeMetadataProvider {
  const endUserId = input.endUserId;
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
          params: buildGmailMessageMetadataRequestParams(),
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
    async listInboundEmails(request) {
      const { connections } = await sdk.listConnections({
        integrationId: GMAIL_RUNTIME_INTEGRATION_ID,
        tags: { end_user_id: endUserId },
        limit: 10,
      });

      const targets = [
        ...new Map(
          (connections ?? [])
            .map((connection) => {
              const connectionId = resolveNangoConnectionId(connection);
              return connectionId
                ? ([hashClosedLoopAccountScope(connectionId), connectionId] as const)
                : undefined;
            })
            .filter((item): item is readonly [string, string] => Boolean(item)),
        ).entries(),
      ];
      const accountScopes = targets.map(([accountScope]) => accountScope);
      if (targets.length === 0) {
        return { accountScopes: [], emails: [], needsAccountSelection: false };
      }

      const selected = request.accountScope?.trim();
      const selectedTarget = selected
        ? targets.find(([accountScope]) => accountScope === selected)
        : undefined;
      if (!selectedTarget) {
        return { accountScopes, emails: [], needsAccountSelection: true };
      }

      const [accountScope, connectionId] = selectedTarget;
      const maxResults = Math.max(1, Math.min(request.limit, 50));
      const listResponse = await sdk.get<GmailMessagesListResponse>({
        providerConfigKey: GMAIL_RUNTIME_INTEGRATION_ID,
        connectionId,
        endpoint: GMAIL_MESSAGES_LIST_ENDPOINT,
        params: { maxResults },
      });

      const messageIds = (listResponse.data.messages ?? [])
        .map((message) => message.id)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
        .slice(0, maxResults);

      const emails: GmailClosedLoopInboundEmail[] = [];
      for (const rawMessageId of messageIds) {
        const detailResponse = await sdk.get<GmailMessageMetadataResponse>({
          providerConfigKey: GMAIL_RUNTIME_INTEGRATION_ID,
          connectionId,
          endpoint: buildMessageMetadataEndpoint(rawMessageId),
          params: buildGmailClosedLoopMetadataRequestParams(),
        });
        const normalized = normalizeClosedLoopInboundEmail(detailResponse.data, rawMessageId, accountScope);
        if (normalized) {
          emails.push(normalized);
        }
      }

      return {
        accountScopes,
        selectedAccountScope: accountScope,
        needsAccountSelection: false,
        emails: emails
          .filter((item) => {
            const occurredAt = Date.parse(item.receivedAt);
            if (!Number.isFinite(occurredAt)) return false;
            if (request.from != null && occurredAt < Date.parse(request.from)) return false;
            if (request.to != null && occurredAt > Date.parse(request.to)) return false;
            return true;
          })
          .sort((left, right) => left.receivedAt.localeCompare(right.receivedAt) || left.id.localeCompare(right.id))
          .slice(0, maxResults),
      };
    },
  };
}
