import { NextRequest, NextResponse } from "next/server";
import { readApplyFlowNangoConnectSessionEnv } from "@/lib/provider-runtime/nango-connect-session-launcher";
import { createNangoConnectionVerificationProvider } from "@/lib/provider-runtime/nango-connection-verification-provider";
import {
  handleGmailClosedLoopInboundScan,
  parseGmailClosedLoopInboundRequest,
} from "@/lib/provider-runtime/gmail-closed-loop-inbound-boundary";
import { resolveNangoRouteCaller } from "@/lib/provider-runtime/nango-route-caller";

export async function POST(request: NextRequest) {
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { status: "blocked", emails: [], accountScopes: [], warnings: ["invalid_json"], readOnly: true, safeForClient: true },
      { status: 400 },
    );
  }

  const parsed = parseGmailClosedLoopInboundRequest(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { status: "blocked", emails: [], accountScopes: [], warnings: [parsed.error], readOnly: true, safeForClient: true },
      { status: parsed.httpStatus },
    );
  }

  try {
    const env = readApplyFlowNangoConnectSessionEnv();
    const caller = resolveNangoRouteCaller({ request, env, mintIfMissing: false });
    if (caller.required && !caller.ok) {
      return NextResponse.json(
        {
          status: "blocked",
          emails: [],
          accountScopes: [],
          warnings: [caller.reason],
          readOnly: true,
          safeForClient: true,
        },
        { status: caller.httpStatus },
      );
    }

    const result = await handleGmailClosedLoopInboundScan({
      env,
      requestedAt: new Date().toISOString(),
      limit: parsed.limit,
      explicitConsent: true,
      ...(parsed.accountScope ? { accountScope: parsed.accountScope } : {}),
      ...(caller.required && caller.ok ? { callerNonce: caller.callerNonce } : {}),
      verificationDeps: env.NANGO_SECRET_KEY?.trim() && caller.required && caller.ok
        ? { verificationProvider: createNangoConnectionVerificationProvider({ secretKey: env.NANGO_SECRET_KEY, callerNonce: caller.callerNonce }) }
        : {},
    });
    const httpStatus = result.status === "blocked" ? 200 : result.status === "error" ? 500 : 200;
    return NextResponse.json(result, { status: httpStatus });
  } catch {
    return NextResponse.json(
      {
        runtime: "nango",
        status: "error",
        safeForClient: true,
        readOnly: true,
        emails: [],
        accountScopes: [],
        warnings: ["gmail_closed_loop_scan_failed"],
        hasToken: false,
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({ status: "blocked", emails: [], accountScopes: [], readOnly: true }, { status: 405 });
}
