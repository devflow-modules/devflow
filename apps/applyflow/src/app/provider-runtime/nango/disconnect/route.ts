import { NextRequest, NextResponse } from "next/server";
import { handleApplyFlowNangoConnectionDisconnect } from "@/lib/provider-runtime/nango-connection-disconnect-boundary";
import { createNangoConnectionDisconnectProvider } from "@/lib/provider-runtime/nango-connection-disconnect-provider";
import { readApplyFlowNangoConnectSessionEnv } from "@/lib/provider-runtime/nango-connect-session-launcher";
import { parseConnectionVerificationProvider } from "@/lib/provider-runtime/nango-connection-verification-boundary";
import {
  buildApplyFlowNangoAccountEndUserId,
  resolveNangoPersonalRoute,
} from "@/lib/provider-runtime/nango-account-identity";

/**
 * Removes the Nango connection owned by the authenticated ApplyFlow account.
 * Does not sign the user out and does not revoke the Google Account OAuth grant.
 * Client connection IDs and browser caller cookies are ignored.
 */

function blockedDisconnect(reason: string, messages: string[], status: number) {
  return NextResponse.json(
    {
      runtime: "nango",
      status: "blocked",
      safeForClient: true,
      hasToken: false,
      warnings: [reason],
      messages,
    },
    { status },
  );
}

export async function POST(request: NextRequest) {
  const env = readApplyFlowNangoConnectSessionEnv();
  let body: {
    provider?: string;
    explicitConfirmation?: boolean | string;
    adoptLegacyBrowserConnection?: boolean;
  } = {};

  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const owner = await resolveNangoPersonalRoute({
    request,
    env,
    adoptLegacyBrowserConnection: body.adoptLegacyBrowserConnection === true,
  });
  if (!owner.ok) {
    return blockedDisconnect(
      owner.reason,
      ["An authenticated ApplyFlow account is required before disconnecting a Nango connection."],
      owner.httpStatus,
    );
  }

  const provider = parseConnectionVerificationProvider(body.provider);
  const hasInvalidProvider = body.provider != null && provider == null;
  const missingConfirmation =
    body.explicitConfirmation == null ||
    !(
      body.explicitConfirmation === true ||
      body.explicitConfirmation === "1" ||
      body.explicitConfirmation === "true"
    );

  if (hasInvalidProvider || (provider == null && body.provider == null) || missingConfirmation) {
    const result = await handleApplyFlowNangoConnectionDisconnect(body, { env, disconnectDeps: {} });
    const statusCode =
      hasInvalidProvider || (provider == null && body.provider == null) ? 400 : 403;
    return NextResponse.json(result, { status: statusCode });
  }

  const disconnectDeps =
    env.NANGO_SECRET_KEY?.trim() && provider
      ? {
          disconnectProvider: createNangoConnectionDisconnectProvider({
            secretKey: env.NANGO_SECRET_KEY,
            endUserId: buildApplyFlowNangoAccountEndUserId(provider, owner.accountId),
          }),
        }
      : {};

  const result = await handleApplyFlowNangoConnectionDisconnect(body, {
    env,
    disconnectDeps,
  });

  return NextResponse.json(
    {
      ...result,
      ownership: "applyflow_account",
      revokedGoogleOAuth: false,
      signedOut: false,
    },
    { status: 200 },
  );
}

export async function GET() {
  return NextResponse.json(
    {
      runtime: "nango",
      status: "blocked",
      safeForClient: true,
      hasToken: false,
      warnings: ["method_not_allowed"],
      messages: ["Provider disconnect must be requested with POST."],
    },
    { status: 405 },
  );
}
