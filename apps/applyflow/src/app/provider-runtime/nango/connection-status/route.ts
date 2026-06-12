import { NextRequest, NextResponse } from "next/server";
import {
  handleApplyFlowNangoConnectionVerification,
  parseConnectionVerificationExplicitConsent,
  parseConnectionVerificationProvider,
} from "@/lib/provider-runtime/nango-connection-verification-boundary";
import { readApplyFlowNangoConnectSessionEnv } from "@/lib/provider-runtime/nango-connect-session-launcher";
import { createNangoConnectionVerificationProvider } from "@/lib/provider-runtime/nango-connection-verification-provider";

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

  const verificationDeps = env.NANGO_SECRET_KEY?.trim()
    ? {
        verificationProvider: createNangoConnectionVerificationProvider({
          secretKey: env.NANGO_SECRET_KEY,
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

  const provider = parseConnectionVerificationProvider(body.provider);
  const hasInvalidProvider = body.provider != null && provider == null;
  const missingConsent =
    body.explicitConsent == null ||
    !parseConnectionVerificationExplicitConsent(body.explicitConsent);

  const statusCode = hasInvalidProvider || (provider == null && body.provider == null)
    ? 400
    : missingConsent
      ? 403
      : 200;

  return NextResponse.json(result, { status: statusCode });
}
