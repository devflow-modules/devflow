// Server-only Nango connection disconnect adapter.
// Do not import this file from client components.

import { Nango } from "@nangohq/node";
import type { ProviderKind } from "@devflow/career-sync";
import {
  buildApplyFlowNangoEndUserId,
  NANGO_INTEGRATION_BY_PROVIDER,
} from "./nango-server-provider";

export type NangoConnectionDisconnectOutcome =
  | { kind: "not_found" }
  | { kind: "deleted" }
  | { kind: "ambiguous"; connectionCount: number }
  | { kind: "delete_failed" }
  | { kind: "verification_failed" };

export type NangoConnectionDisconnectProvider = {
  disconnectProvider(input: { provider: ProviderKind }): Promise<NangoConnectionDisconnectOutcome>;
};

export type NangoConnectionDisconnectSdk = {
  listConnections(input: {
    integrationId: string;
    tags: Record<string, string>;
    limit: number;
  }): Promise<{ connections?: Array<Record<string, unknown>> }>;
  deleteConnection(providerConfigKey: string, connectionId: string): Promise<unknown>;
};

function resolveNangoConnectionId(connection: Record<string, unknown> | undefined): string | undefined {
  if (!connection) {
    return undefined;
  }

  const candidate = connection.connection_id ?? connection.connectionId;

  return typeof candidate === "string" && candidate.trim().length > 0 ? candidate.trim() : undefined;
}

export function createNangoConnectionDisconnectSdk(secretKey: string): NangoConnectionDisconnectSdk {
  const nango = new Nango({ secretKey });

  return {
    listConnections: (input) => nango.listConnections(input),
    deleteConnection: (providerConfigKey, connectionId) =>
      nango.deleteConnection(providerConfigKey, connectionId),
  };
}

export function createNangoConnectionDisconnectProvider(input: {
  secretKey: string;
  sdk?: NangoConnectionDisconnectSdk;
}): NangoConnectionDisconnectProvider {
  const sdk = input.sdk ?? createNangoConnectionDisconnectSdk(input.secretKey);

  return {
    async disconnectProvider({ provider }) {
      const integrationId = NANGO_INTEGRATION_BY_PROVIDER[provider];
      const endUserId = buildApplyFlowNangoEndUserId(provider);

      let connections: Array<Record<string, unknown>> = [];

      try {
        const listed = await sdk.listConnections({
          integrationId,
          tags: { end_user_id: endUserId },
          limit: 10,
        });
        connections = (listed.connections ?? []).filter((row) => resolveNangoConnectionId(row) != null);
      } catch {
        return { kind: "delete_failed" };
      }

      if (connections.length === 0) {
        return { kind: "not_found" };
      }

      if (connections.length > 1) {
        return { kind: "ambiguous", connectionCount: connections.length };
      }

      const connectionId = resolveNangoConnectionId(connections[0]);

      if (!connectionId) {
        return { kind: "not_found" };
      }

      try {
        await sdk.deleteConnection(integrationId, connectionId);
      } catch {
        return { kind: "delete_failed" };
      }

      try {
        const postDelete = await sdk.listConnections({
          integrationId,
          tags: { end_user_id: endUserId },
          limit: 10,
        });
        const remaining = (postDelete.connections ?? []).filter(
          (row) => resolveNangoConnectionId(row) != null,
        );

        if (remaining.length > 0) {
          return { kind: "verification_failed" };
        }
      } catch {
        return { kind: "verification_failed" };
      }

      return { kind: "deleted" };
    },
  };
}
