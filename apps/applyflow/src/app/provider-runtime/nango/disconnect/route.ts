import { NextRequest, NextResponse } from "next/server";
import { handleApplyFlowNangoConnectionDisconnect } from "@/lib/provider-runtime/nango-connection-disconnect-boundary";
import { createNangoConnectionDisconnectProvider } from "@/lib/provider-runtime/nango-connection-disconnect-provider";
import { readApplyFlowNangoConnectSessionEnv } from "@/lib/provider-runtime/nango-connect-session-launcher";
import { parseConnectionVerificationProvider } from "@/lib/provider-runtime/nango-connection-verification-boundary";

/**
 * Server-side Nango provider disconnect boundary.
 * Removes the tagged connection server-side only — never accepts client connection IDs.
 */

export async function POST(request: NextRequest) {
  const env = readApplyFlowNangoConnectSessionEnv();
  let body: { provider?: string; explicitConfirmation?: boolean | string } = {};

  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
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

  const disconnectDeps = env.NANGO_SECRET_KEY?.trim()
    ? {
        disconnectProvider: createNangoConnectionDisconnectProvider({
          secretKey: env.NANGO_SECRET_KEY,
        }),
      }
    : {};

  const result = await handleApplyFlowNangoConnectionDisconnect(body, {
    env,
    disconnectDeps,
  });

  const statusCode = hasInvalidProvider || (provider == null && body.provider == null)
    ? 400
    : missingConfirmation
      ? 403
      : 200;

  return NextResponse.json(result, { status: statusCode });
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
