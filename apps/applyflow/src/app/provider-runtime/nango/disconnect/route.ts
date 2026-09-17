import { NextRequest, NextResponse } from "next/server";
import { handleApplyFlowNangoConnectionDisconnect } from "@/lib/provider-runtime/nango-connection-disconnect-boundary";
import { createNangoConnectionDisconnectProvider } from "@/lib/provider-runtime/nango-connection-disconnect-provider";
import { readApplyFlowNangoConnectSessionEnv } from "@/lib/provider-runtime/nango-connect-session-launcher";
import { parseConnectionVerificationProvider } from "@/lib/provider-runtime/nango-connection-verification-boundary";
import { resolveNangoRouteCaller } from "@/lib/provider-runtime/nango-route-caller";

/**
 * Server-side Nango provider disconnect boundary.
 * Removes the tagged connection for the validated caller session only.
 * Client connection IDs, tags, and end_user_id overrides are ignored.
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
  const caller = resolveNangoRouteCaller({ request, env, mintIfMissing: false });
  if (caller.required && !caller.ok) {
    return blockedDisconnect(
      caller.reason,
      ["A same-origin caller session is required before disconnecting a Nango connection."],
      caller.httpStatus,
    );
  }

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

  if (hasInvalidProvider || (provider == null && body.provider == null) || missingConfirmation) {
    const result = await handleApplyFlowNangoConnectionDisconnect(body, { env, disconnectDeps: {} });
    const statusCode =
      hasInvalidProvider || (provider == null && body.provider == null) ? 400 : 403;
    return NextResponse.json(result, { status: statusCode });
  }

  const disconnectDeps =
    env.NANGO_SECRET_KEY?.trim() && caller.required && caller.ok
      ? {
          disconnectProvider: createNangoConnectionDisconnectProvider({
            secretKey: env.NANGO_SECRET_KEY,
            callerNonce: caller.callerNonce,
          }),
        }
      : {};

  const result = await handleApplyFlowNangoConnectionDisconnect(body, {
    env,
    disconnectDeps,
  });

  return NextResponse.json(result, { status: 200 });
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
