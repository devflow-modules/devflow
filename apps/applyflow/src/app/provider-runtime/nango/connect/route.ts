import { NextRequest, NextResponse } from "next/server";
import {
  handleApplyFlowNangoConnectSessionLauncher,
  readApplyFlowNangoConnectSessionEnv,
} from "@/lib/provider-runtime/nango-connect-session-launcher";
import { createNangoServerConnectSessionProvider } from "@/lib/provider-runtime/nango-server-provider";

/**
 * Server-side Nango connect session launcher.
 * Returns client-safe JSON including short-lived connect session token when allowed.
 * Never returns NANGO_SECRET_KEY or OAuth access/refresh tokens.
 */

export async function GET(request: NextRequest) {
  const env = readApplyFlowNangoConnectSessionEnv();
  const provider = request.nextUrl.searchParams.get("provider");
  const redirectUri = request.nextUrl.searchParams.get("redirect_uri");
  const explicitConsent = request.nextUrl.searchParams.get("explicit_consent");

  const sessionDeps = env.NANGO_SECRET_KEY?.trim()
    ? {
        connectSessionProvider: createNangoServerConnectSessionProvider({
          secretKey: env.NANGO_SECRET_KEY,
          connectLauncherBasePath: "/provider-runtime/nango/connect",
        }),
      }
    : {};

  const result = await handleApplyFlowNangoConnectSessionLauncher(
    { provider, redirectUri, explicitConsent },
    { env, sessionDeps },
  );

  const statusCode =
    result.reasons.includes("missing_provider") || result.reasons.includes("invalid_provider")
      ? 400
      : result.status === "oauth_start_ready"
        ? 200
        : 403;

  return NextResponse.json(result, { status: statusCode });
}
