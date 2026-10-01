import { NextResponse } from "next/server";

import {
  APPLYFLOW_E2E_SESSION_COOKIE,
  authorizeE2ESessionMutation,
  createE2ESessionToken,
} from "@/lib/e2e/session";
import { isApplyFlowE2ERuntimeAllowed } from "@/lib/e2e/runtime-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * E2E-only session bootstrap. Fail-closed outside local/CI E2E runtime.
 * Never available on real Vercel production/preview (VERCEL=1).
 */
export async function POST(request: Request) {
  if (!isApplyFlowE2ERuntimeAllowed()) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  let body: { action?: string } = {};
  try {
    body = (await request.json()) as { action?: string };
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const action = body.action === "logout" ? "logout" : body.action === "login" ? "login" : null;
  if (!action) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (action === "logout") {
    // Ending an E2E session does not require the bootstrap secret — only that E2E runtime is open.
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

  const token = createE2ESessionToken();
  if (!token) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true, action: "login" });
  response.cookies.set(APPLYFLOW_E2E_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: false,
    maxAge: 60 * 60,
  });
  return response;
}
