import { NextRequest, NextResponse } from "next/server";
import {
  handleApplyFlowNangoConnectionVerification,
  parseConnectionVerificationExplicitConsent,
  parseConnectionVerificationProvider,
} from "@/lib/provider-runtime/nango-connection-verification-boundary";
import { readApplyFlowNangoConnectSessionEnv } from "@/lib/provider-runtime/nango-connect-session-launcher";
import { createNangoConnectionVerificationProvider } from "@/lib/provider-runtime/nango-connection-verification-provider";
import { resolveNangoRouteCaller } from "@/lib/provider-runtime/nango-route-caller";

/**
 * Server-side Nango connection verification boundary.
 * Returns client-safe verification snapshot only — never secrets, OAuth tokens, or raw connections.
 */

export async function POST(request: NextRequest) {
  const env = readApplyFlowNangoConnectSessionEnv();
  let body: { provider?: string; explicitConsent?: boolean | string } = {};

  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
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

  const caller = resolveNangoRouteCaller({ request, env, mintIfMissing: false });
  if (caller.required && !caller.ok) {
    return NextResponse.json(
      {
        runtime: "nango",
        status: "blocked",
        safeForClient: true,
        hasToken: false,
        warnings: ["missing_caller_session"],
        messages: ["A caller session is required before verifying a Nango connection."],
      },
      { status: 401 },
    );
  }

  const verificationDeps =
    env.NANGO_SECRET_KEY?.trim() && caller.required && caller.ok
      ? {
          verificationProvider: createNangoConnectionVerificationProvider({
            secretKey: env.NANGO_SECRET_KEY,
            callerNonce: caller.callerNonce,
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

  return NextResponse.json(result, { status: 200 });
}
