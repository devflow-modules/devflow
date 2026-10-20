import { NextResponse } from "next/server";

import { enforceSameOriginMutatingRequest } from "@/lib/http/same-origin-guard";
import { resolveApplyFlowAccountFromRequest } from "@/lib/persistence-v2/auth/resolve-account-from-request";
import {
  applyFlowAuthErrorResponse,
  applyFlowV2HttpAccessErrorResponse,
  assertApplyFlowExtensionGrantMint,
} from "@/lib/persistence-v2/http-access";
import {
  EXTENSION_GRANT_REQUESTABLE_SCOPES,
  parseExtensionGrantScopes,
} from "@/lib/persistence-v2/personal/extension-grant-scopes";
import { applyFlowExtensionGrants } from "@/lib/persistence-v2/personal/extension-grants";
import { ApplyFlowAuthError, requireApplyFlowAccount } from "@/lib/persistence-v2/require-applyflow-account";
import { resolveApplyFlowPersistenceAccess } from "@/lib/persistence-v2/resolve-persistence-access";

/**
 * Extension session grant.
 * The browser page mints it with the Supabase cookie session after the user
 * confirms an explicit scope list. The extension later presents only the opaque
 * bearer. HttpOnly cookies are not copied. Logout revokes grants. Nango disconnect does not.
 */
export async function POST(request: Request) {
  const originBlock = enforceSameOriginMutatingRequest(request);
  if (originBlock) return originBlock;
  try {
    const account = await requireApplyFlowAccount();
    assertApplyFlowExtensionGrantMint(resolveApplyFlowPersistenceAccess(account));

    let body: unknown = null;
    try {
      body = await request.json();
    } catch {
      body = null;
    }
    const rawScopes =
      body && typeof body === "object" && !Array.isArray(body)
        ? (body as { scopes?: unknown }).scopes
        : undefined;
    const scopes = parseExtensionGrantScopes(rawScopes);
    if (!scopes) {
      return NextResponse.json(
        {
          error: "scopes_required",
          requestableScopes: [...EXTENSION_GRANT_REQUESTABLE_SCOPES],
        },
        { status: 400 },
      );
    }
    for (const scope of scopes) {
      if (!EXTENSION_GRANT_REQUESTABLE_SCOPES.includes(scope)) {
        return NextResponse.json({ error: "scopes_invalid" }, { status: 400 });
      }
    }

    const minted = await applyFlowExtensionGrants.mint(account.id, scopes);
    return NextResponse.json({
      accountId: minted.accountId,
      token: minted.token,
      expiresAt: minted.expiresAt,
      scopes: minted.scopes,
      autoSubmit: false,
    });
  } catch (error) {
    const access = applyFlowV2HttpAccessErrorResponse(error);
    if (access) return access;
    const auth = applyFlowAuthErrorResponse(error);
    if (auth) return auth;
    if (error instanceof ApplyFlowAuthError) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const account = await resolveApplyFlowAccountFromRequest(request);
    assertApplyFlowExtensionGrantMint(resolveApplyFlowPersistenceAccess(account));

    const header = request.headers.get("authorization");
    const bearer =
      header?.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : null;
    if (bearer) {
      const resolved = await applyFlowExtensionGrants.resolve(bearer);
      if (!resolved) {
        return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
      }
      return NextResponse.json({
        accountId: account.id,
        scopes: resolved.scopes,
        autoSubmit: false,
      });
    }

    return NextResponse.json({
      accountId: account.id,
      requestableScopes: [...EXTENSION_GRANT_REQUESTABLE_SCOPES],
      autoSubmit: false,
    });
  } catch (error) {
    const access = applyFlowV2HttpAccessErrorResponse(error);
    if (access) return access;
    const auth = applyFlowAuthErrorResponse(error);
    if (auth) return auth;
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
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
