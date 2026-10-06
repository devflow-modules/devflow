import { NextRequest, NextResponse } from "next/server";
import {
  handleApplyFlowNangoConnectionVerification,
  parseConnectionVerificationExplicitConsent,
  parseConnectionVerificationProvider,
} from "@/lib/provider-runtime/nango-connection-verification-boundary";
import { readApplyFlowNangoConnectSessionEnv } from "@/lib/provider-runtime/nango-connect-session-launcher";
import { createNangoConnectionVerificationProvider } from "@/lib/provider-runtime/nango-connection-verification-provider";
import {
  buildApplyFlowNangoAccountEndUserId,
  resolveNangoPersonalRoute,
} from "@/lib/provider-runtime/nango-account-identity";

/**
 * Server-side Nango connection verification.
 * Lists only connections tagged to the authenticated ApplyFlow account.
 * A leftover browser caller cookie is ignored and does not adopt old connections.
 */

function blockedVerification(reason: string, messages: string[], status: number) {
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
  let body: { provider?: string; explicitConsent?: boolean | string; adoptLegacyBrowserConnection?: boolean } = {};

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
    return blockedVerification(
      owner.reason,
      ["An authenticated ApplyFlow account is required before verifying a Nango connection."],
      owner.httpStatus,
    );
  }

  const provider = parseConnectionVerificationProvider(body.provider);
  const hasInvalidProvider = body.provider != null && provider == null;
  const missingConsent =
    body.explicitConsent == null ||
    !parseConnectionVerificationExplicitConsent(body.explicitConsent);

  if (hasInvalidProvider || (provider == null && body.provider == null)) {
    const result = await handleApplyFlowNangoConnectionVerification(
      { provider: body.provider, explicitConsent: body.explicitConsent },
      { env, verificationDeps: {} },
    );
    return NextResponse.json(result, { status: 400 });
  }

  if (missingConsent) {
    const result = await handleApplyFlowNangoConnectionVerification(
      { provider: body.provider, explicitConsent: body.explicitConsent },
      { env, verificationDeps: {} },
    );
    return NextResponse.json(result, { status: 403 });
  }

  const verificationDeps =
    env.NANGO_SECRET_KEY?.trim() && provider
      ? {
          verificationProvider: createNangoConnectionVerificationProvider({
            secretKey: env.NANGO_SECRET_KEY,
            endUserId: buildApplyFlowNangoAccountEndUserId(provider, owner.accountId),
          }),
        }
      : {};

  const result = await handleApplyFlowNangoConnectionVerification(
    {
      provider: body.provider,
      explicitConsent: body.explicitConsent,
    },
    { env, verificationDeps },
  );

  return NextResponse.json(
    {
      ...result,
      ownership: "applyflow_account",
      legacyBrowserIdentityIgnored: owner.legacyBrowserCookiePresent,
    },
    { status: 200 },
  );
}
