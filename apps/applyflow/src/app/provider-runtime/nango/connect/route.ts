import { NextRequest, NextResponse } from "next/server";
import {
  handleApplyFlowNangoConnectSessionLauncher,
  readApplyFlowNangoConnectSessionEnv,
} from "@/lib/provider-runtime/nango-connect-session-launcher";
import { attachNangoCallerCookie, resolveNangoRouteCaller } from "@/lib/provider-runtime/nango-route-caller";
import { createNangoServerConnectSessionProvider } from "@/lib/provider-runtime/nango-server-provider";

/**
 * Server-side Nango connect session launcher.
 * POST creates a caller-scoped Connect Session. GET is rejected.
 * The af_nango_caller cookie is an anonymous browser session, not a user login.
 * Never returns NANGO_SECRET_KEY or OAuth access/refresh tokens.
 */

type ConnectBody = {
  provider?: string;
  redirectUri?: string;
  explicitConsent?: boolean | string;
  endUserId?: unknown;
  connectionId?: unknown;
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

  const caller = resolveNangoRouteCaller({
    request,
    env,
    mintIfMissing: true,
  });

  if (caller.required && !caller.ok) {
    return blockedConnect(
      caller.reason,
      ["A same-origin caller session is required before Nango connect can start."],
      caller.httpStatus,
    );
  }

  const sessionDeps =
    env.NANGO_SECRET_KEY?.trim() && caller.required && caller.ok
      ? {
          connectSessionProvider: createNangoServerConnectSessionProvider({
            secretKey: env.NANGO_SECRET_KEY,
            callerNonce: caller.callerNonce,
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

  return attachNangoCallerCookie(
    NextResponse.json(result, { status: statusCode }),
    caller.required && caller.ok ? caller.setCookie : undefined,
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
