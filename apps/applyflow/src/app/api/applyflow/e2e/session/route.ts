import { NextResponse } from "next/server";

import {
  APPLYFLOW_E2E_AUTH_SUB,
  APPLYFLOW_E2E_SESSION_COOKIE,
  authorizeE2ESessionMutation,
  createE2ESessionToken,
  isAllowedE2EAuthSub,
} from "@/lib/e2e/session";
import { isApplyFlowE2ERuntimeAllowed } from "@/lib/e2e/runtime-guard";
import { seedE2EApplyFlowAccount } from "@/lib/e2e/v2-seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SessionBody = {
  action?: string;
  authSub?: string;
  /** Seed pilot + v2_cloud for this authSub (E2E + V2 tests only). */
  seedV2?: boolean;
  /** Seed pilotEligible without activating v2_cloud. */
  seedPilot?: boolean;
  /** Force non-pilot v1_local (explicit closed-beta gate assertion). */
  seedNonPilot?: boolean;
};

/**
 * E2E-only session bootstrap. Fail-closed outside local/CI E2E runtime.
 * Never available on real Vercel production/preview (VERCEL=1).
 */
export async function POST(request: Request) {
  if (!isApplyFlowE2ERuntimeAllowed()) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  let body: SessionBody = {};
  try {
    body = (await request.json()) as SessionBody;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const action = body.action === "logout" ? "logout" : body.action === "login" ? "login" : null;
  if (!action) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (action === "logout") {
    const response = NextResponse.json({ ok: true, action: "logout" });
    response.cookies.set(APPLYFLOW_E2E_SESSION_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: false,
      maxAge: 0,
    });
    return response;
  }

  const secret = request.headers.get("x-applyflow-e2e-secret");
  if (!authorizeE2ESessionMutation(secret)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const authSub =
    typeof body.authSub === "string" && body.authSub.trim().length > 0
      ? body.authSub.trim()
      : APPLYFLOW_E2E_AUTH_SUB;
  if (!isAllowedE2EAuthSub(authSub)) {
    return NextResponse.json({ error: "invalid_auth_sub" }, { status: 400 });
  }

  let seeded: Awaited<ReturnType<typeof seedE2EApplyFlowAccount>> | null = null;
  if (body.seedV2 || body.seedPilot || body.seedNonPilot) {
    try {
      seeded = await seedE2EApplyFlowAccount({
        authProviderSub: authSub,
        pilotEligible: body.seedNonPilot ? false : true,
        v2Cloud: Boolean(body.seedV2) && !body.seedNonPilot,
      });
    } catch {
      return NextResponse.json({ error: "seed_failed" }, { status: 500 });
    }
  }

  const token = createE2ESessionToken(process.env, authSub);
  if (!token) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const response = NextResponse.json({
    ok: true,
    action: "login",
    authSub,
    ...(seeded
      ? {
          accountId: seeded.accountId,
          pilotEligible: seeded.pilotEligible,
          canonicalPersistence: seeded.canonicalPersistence,
        }
      : {}),
  });
  response.cookies.set(APPLYFLOW_E2E_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: false,
    maxAge: 60 * 60,
  });
  return response;
}
