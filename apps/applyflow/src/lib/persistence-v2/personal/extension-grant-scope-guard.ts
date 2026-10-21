import { NextResponse } from "next/server";

import { applyFlowExtensionGrants } from "./extension-grants";
import {
  type ExtensionGrantScope,
  grantHasScope,
} from "./extension-grant-scopes";

function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const [scheme, token] = header.split(/\s+/);
  if (scheme !== "Bearer" || !token) return null;
  return token.trim() || null;
}

/**
 * Cookie/session callers are unaffected (dashboard keeps full personal API access
 * gated only by persistence mode). Bearer callers must hold the explicit scope.
 * Returns a response to short-circuit, or null to continue.
 */
export async function denyIfBearerLacksGrantScope(
  request: Request,
  required: ExtensionGrantScope,
): Promise<NextResponse | null> {
  const token = bearerToken(request);
  if (!token) return null;

  const resolved = await applyFlowExtensionGrants.resolve(token);
  if (!resolved) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!grantHasScope(resolved.scopes, required)) {
    return NextResponse.json(
      { error: "grant_capability_denied", scope: required },
      { status: 403 },
    );
  }
  return null;
}
