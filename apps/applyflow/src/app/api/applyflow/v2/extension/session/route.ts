import { NextResponse } from "next/server";

import { enforceSameOriginMutatingRequest } from "@/lib/http/same-origin-guard";
import { applyFlowAuthErrorResponse } from "@/lib/persistence-v2/http-access";
import { applyFlowExtensionGrants } from "@/lib/persistence-v2/personal/extension-grants";
import { ApplyFlowAuthError, requireApplyFlowAccount } from "@/lib/persistence-v2/require-applyflow-account";

function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

/**
 * Extension session grant.
 * The browser page mints it with the Supabase cookie session.
 * The extension later presents only the opaque bearer. HttpOnly cookies are not copied.
 * Logout revokes grants. Nango disconnect does not.
 */
export async function POST(request: Request) {
  const originBlock = enforceSameOriginMutatingRequest(request);
  if (originBlock) return originBlock;
  try {
    const account = await requireApplyFlowAccount();
    const minted = await applyFlowExtensionGrants.mint(account.id);
    return NextResponse.json({
      accountId: minted.accountId,
      token: minted.token,
      expiresAt: minted.expiresAt,
      autoSubmit: false,
    });
  } catch (error) {
    const auth = applyFlowAuthErrorResponse(error);
    if (auth) return auth;
    if (error instanceof ApplyFlowAuthError) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const resolved = await applyFlowExtensionGrants.resolve(bearerToken(request));
  if (!resolved) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  return NextResponse.json({ accountId: resolved.accountId, autoSubmit: false });
}

export async function DELETE(request: Request) {
  const originBlock = enforceSameOriginMutatingRequest(request);
  if (originBlock) return originBlock;
  try {
    const account = await requireApplyFlowAccount();
    await applyFlowExtensionGrants.revokeAccount(account.id);
    return NextResponse.json({ revoked: true, disconnectedProviders: false });
  } catch (error) {
    const auth = applyFlowAuthErrorResponse(error);
    if (auth) return auth;
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
