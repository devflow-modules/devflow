import { NextRequest, NextResponse } from "next/server";
import {
  handleApplyFlowNangoConnectSessionLauncher,
  readApplyFlowNangoConnectSessionEnv,
} from "@/lib/provider-runtime/nango-connect-session-launcher";
import {
  buildApplyFlowNangoAccountEndUserId,
  resolveNangoPersonalRoute,
} from "@/lib/provider-runtime/nango-account-identity";
import { createNangoServerConnectSessionProvider } from "@/lib/provider-runtime/nango-server-provider";

/**
 * Server-side Nango connect session launcher.
 * Ownership is the authenticated ApplyFlow account. Browser caller cookies and
 * client end_user_id values are ignored. Logout does not call this route.
 * Never returns NANGO_SECRET_KEY or OAuth access/refresh tokens.
 */

type ConnectBody = {
  provider?: string;
  redirectUri?: string;
  explicitConsent?: boolean | string;
  endUserId?: unknown;
  connectionId?: unknown;
  adoptLegacyBrowserConnection?: boolean;
};

function blockedConnect(reason: string, messages: string[], status: number) {
  return NextResponse.json(
    {
      safeForClient: true,
      status: "blocked",
      runtime: "nango",
      canStartOAuth: false,
      messages,
      reasons: [reason],
    },
    { status },
  );
}

export async function POST(request: NextRequest) {
  const env = readApplyFlowNangoConnectSessionEnv();
  let body: ConnectBody = {};

  try {
    body = (await request.json()) as ConnectBody;
  } catch {
    body = {};
  }

  const owner = await resolveNangoPersonalRoute({
    request,
    env,
    adoptLegacyBrowserConnection: body.adoptLegacyBrowserConnection === true,
  });
  if (!owner.ok) {
    return blockedConnect(
      owner.reason,
      ["An authenticated ApplyFlow account is required before Nango connect can start."],
      owner.httpStatus,
    );
  }

  const provider = body.provider === "gmail" || body.provider === "calendar" ? body.provider : null;
  const sessionDeps =
    env.NANGO_SECRET_KEY?.trim() && provider
      ? {
          connectSessionProvider: createNangoServerConnectSessionProvider({
            secretKey: env.NANGO_SECRET_KEY,
            endUserId: buildApplyFlowNangoAccountEndUserId(provider, owner.accountId),
            connectLauncherBasePath: "/provider-runtime/nango/connect",
          }),
        }
      : {};

  const result = await handleApplyFlowNangoConnectSessionLauncher(
    {
      provider: typeof body.provider === "string" ? body.provider : undefined,
      redirectUri: typeof body.redirectUri === "string" ? body.redirectUri : undefined,
      explicitConsent: body.explicitConsent,
    },
    { env, sessionDeps },
  );

  const statusCode =
    result.reasons.includes("missing_provider") || result.reasons.includes("invalid_provider")
      ? 400
      : result.status === "oauth_start_ready"
        ? 200
        : 403;

  return NextResponse.json(
    {
      ...result,
      ownership: "applyflow_account",
      legacyBrowserIdentityIgnored: owner.legacyBrowserCookiePresent,
    },
    { status: statusCode },
  );
}

export async function GET() {
  return blockedConnect(
    "method_not_allowed",
    [
      "Nango connect must be requested with POST. GET does not mint a caller session or create a Connect Session.",
    ],
    405,
  );
}
