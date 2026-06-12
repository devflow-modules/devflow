import { NextRequest, NextResponse } from "next/server";
import {
  handleApplyFlowNangoConnectSessionLauncher,
  readApplyFlowNangoConnectSessionEnv,
} from "@/lib/provider-runtime/nango-connect-session-launcher";
import { createNangoServerOAuthUrlProvider } from "@/lib/provider-runtime/nango-server-provider";

/**
 * Server-side Nango connect session launcher.
 * Do not expose secrets or session tokens in responses.
 */

export async function GET(request: NextRequest) {
  const env = readApplyFlowNangoConnectSessionEnv();
  const provider = request.nextUrl.searchParams.get("provider");
  const redirectUri = request.nextUrl.searchParams.get("redirect_uri");

  const oauthUrlProvider = env.NANGO_SECRET_KEY?.trim()
    ? createNangoServerOAuthUrlProvider({
        secretKey: env.NANGO_SECRET_KEY,
        connectLauncherBasePath: "/provider-runtime/nango/connect",
      })
    : {
        createAuthorizationUrl: async () => {
          throw new Error("Nango OAuth URL provider is unavailable without server secret.");
        },
      };

  const result = await handleApplyFlowNangoConnectSessionLauncher(
    { provider, redirectUri },
    { env, oauthUrlProvider },
  );

  const statusCode =
    result.reasons.includes("missing_provider") || result.reasons.includes("invalid_provider")
      ? 400
      : result.status === "oauth_start_ready"
        ? 200
        : 403;

  return NextResponse.json(result, { status: statusCode });
}
