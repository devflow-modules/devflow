// Server-only Nango connection verification adapter.
// Do not import this file from client components.

import { Nango } from "@nangohq/node";
import type { ProviderKind } from "@devflow/career-sync";
import {
  buildApplyFlowNangoEndUserId,
  NANGO_INTEGRATION_BY_PROVIDER,
} from "./nango-server-provider";

export type NangoConnectionVerificationProviderResult = {
  exists: boolean;
  state: "connected" | "not_connected" | "error";
};

export type NangoConnectionVerificationProvider = {
  verifyConnection(input: { provider: ProviderKind }): Promise<NangoConnectionVerificationProviderResult>;
};

export type NangoConnectionVerificationProviderConfig = {
  secretKey: string;
};

type NangoListConnectionRow = {
  errors?: Array<{ type?: string }>;
};

export function createNangoConnectionVerificationProvider(
  config: NangoConnectionVerificationProviderConfig,
): NangoConnectionVerificationProvider {
  return {
    async verifyConnection(input) {
      const nango = new Nango({ secretKey: config.secretKey });
      const integrationId = NANGO_INTEGRATION_BY_PROVIDER[input.provider];
      const endUserId = buildApplyFlowNangoEndUserId(input.provider);

      try {
        const { connections } = await nango.listConnections({
          integrationId,
          tags: { end_user_id: endUserId },
          limit: 10,
        });

        const rows = (connections ?? []) as NangoListConnectionRow[];

        if (rows.length === 0) {
          return { exists: false, state: "not_connected" };
        }

        const hasAuthError = rows.some((row) =>
          (row.errors ?? []).some((entry) => entry.type === "auth"),
        );

        if (hasAuthError) {
          return { exists: false, state: "error" };
        }

        return { exists: true, state: "connected" };
      } catch {
        return { exists: false, state: "error" };
      }
    },
  };
}
