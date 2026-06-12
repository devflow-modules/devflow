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

export type NangoServerConnectSession = {
  connectSessionUrl: string;
  connectSessionToken: string;
};

export type ApplyFlowNangoConnectSessionProvider = {
  createConnectSession(input: {
    provider: ProviderKind;
    redirectUri?: string;
  }): Promise<NangoServerConnectSession>;
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

async function createNangoConnectSessionOnServer(
  config: NangoServerOAuthUrlProviderConfig,
  input: { provider: ProviderKind; redirectUri?: string },
): Promise<NangoServerConnectSession> {
  const nango = new Nango({ secretKey: config.secretKey });
  const integrationId = NANGO_INTEGRATION_BY_PROVIDER[input.provider];
  const connectLauncherBasePath =
    config.connectLauncherBasePath ?? "/provider-runtime/nango/connect";

  const { data } = await nango.createConnectSession({
    tags: {
      end_user_id: `applyflow-${input.provider}-runtime-boundary`,
    },
    allowed_integrations: [integrationId],
  });

  return {
    connectSessionUrl: buildConnectLauncherUrl(
      input.provider,
      input.redirectUri,
      connectLauncherBasePath,
    ),
    connectSessionToken: data.token,
  };
}

/**
 * Nango's server flow uses `createConnectSession` (short-lived client-safe token).
 * Returns launcher URL and connect session token for Connect UI — never secrets or OAuth tokens.
 */
export function createNangoServerConnectSessionProvider(
  config: NangoServerOAuthUrlProviderConfig,
): ApplyFlowNangoConnectSessionProvider {
  return {
    createConnectSession: (input) => createNangoConnectSessionOnServer(config, input),
  };
}

/**
 * Legacy URL-only provider for tests and backward-compatible adapters.
 */
export function createNangoServerOAuthUrlProvider(
  config: NangoServerOAuthUrlProviderConfig,
): NangoOAuthUrlProvider {
  return {
    async createAuthorizationUrl(input) {
      const session = await createNangoConnectSessionOnServer(config, input);
      return session.connectSessionUrl;
    },
  };
}
