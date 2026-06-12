// Server-only Nango provider boundary.
// Do not import this file from client components.

import { Nango } from "@nangohq/node";
import type { NangoOAuthUrlProvider, ProviderKind } from "@devflow/career-sync";

const NANGO_INTEGRATION_BY_PROVIDER: Record<ProviderKind, string> = {
  gmail: "google-mail",
  calendar: "google-calendar",
};

export type NangoServerOAuthUrlProviderConfig = {
  secretKey: string;
  connectLauncherBasePath?: string;
};

function buildConnectLauncherUrl(
  provider: ProviderKind,
  redirectUri: string | undefined,
  basePath: string,
): string {
  const params = new URLSearchParams({ provider });
  if (redirectUri) {
    params.set("redirect_uri", redirectUri);
  }

  return `${basePath}?${params.toString()}`;
}

/**
 * Nango's current server flow uses `createConnectSession` (session token).
 * This provider validates the server session server-side and returns only a
 * client-safe launcher URL. Session token bridging to Connect UI is deferred
 * to a follow-up route/UI PR.
 */
export function createNangoServerOAuthUrlProvider(
  config: NangoServerOAuthUrlProviderConfig,
): NangoOAuthUrlProvider {
  const connectLauncherBasePath =
    config.connectLauncherBasePath ?? "/provider-runtime/nango/connect";

  return {
    async createAuthorizationUrl({ provider, redirectUri }) {
      const nango = new Nango({ secretKey: config.secretKey });
      const integrationId = NANGO_INTEGRATION_BY_PROVIDER[provider];

      await nango.createConnectSession({
        tags: {
          end_user_id: `applyflow-${provider}-runtime-boundary`,
        },
        allowed_integrations: [integrationId],
      });

      return buildConnectLauncherUrl(provider, redirectUri, connectLauncherBasePath);
    },
  };
}
