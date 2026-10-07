import { ApplyFlowAuthError } from "./get-authenticated-user";
import { applyflowPrisma } from "../db";
import { applyFlowExtensionGrants } from "../personal/extension-grants";
import {
  requireApplyFlowAccount,
  type ApplyFlowAccountRecord,
} from "../require-applyflow-account";

function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const [scheme, token] = header.split(/\s+/);
  if (scheme !== "Bearer" || !token) return null;
  return token.trim() || null;
}

/**
 * Resolves the ApplyFlow account from an extension opaque grant or, failing that,
 * from the cookie Supabase session. Never trusts client-supplied accountId.
 */
export async function resolveApplyFlowAccountFromRequest(
  request: Request | undefined,
): Promise<ApplyFlowAccountRecord> {
  if (request) {
    const token = bearerToken(request);
    if (token) {
      const resolved = await applyFlowExtensionGrants.resolve(token);
      if (!resolved) {
        throw new ApplyFlowAuthError("unauthenticated", "Extension grant is missing, expired, or revoked.");
      }
      const account = await applyflowPrisma.applyFlowAccount.findUnique({
        where: { id: resolved.accountId },
        select: {
          id: true,
          authProviderSub: true,
          email: true,
          pilotEligible: true,
          canonicalPersistence: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      if (!account) {
        throw new ApplyFlowAuthError("unauthenticated", "Extension grant account was not found.");
      }
      return account;
    }
  }
  return requireApplyFlowAccount();
}

export function requestHasExtensionBearer(request: Request): boolean {
  return Boolean(bearerToken(request));
}
