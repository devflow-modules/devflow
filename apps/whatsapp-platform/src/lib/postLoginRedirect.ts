import { isSafeInternalNextPath, resolveLoginRedirect } from "@/lib/safe-redirect";
import { isTenantManager } from "@/lib/roles";

const MANAGER_DEFAULT = "/dashboard/ai";
const OPERATOR_DEFAULT = "/inbox";

/**
 * Destino após login ou sessão já válida em `/login`.
 * Gestores: default `/dashboard/ai` (painel de decisão).
 * Operadores: `/inbox` salvo `next` seguro.
 */
export function resolvePostLoginRedirect(
  next: string | null | undefined,
  role: string | null | undefined
): string {
  if (isTenantManager(role)) {
    return resolveLoginRedirect(next ?? null, MANAGER_DEFAULT);
  }

  if (typeof next === "string" && isSafeInternalNextPath(next) && !isPathBlockedForOperatorAfterLogin(next)) {
    return next;
  }

  return OPERATOR_DEFAULT;
}

function isPathBlockedForOperatorAfterLogin(path: string): boolean {
  const p = path.split("?")[0] ?? path;
  if (p === "/onboarding" || p.startsWith("/onboarding/")) return true;
  if (p.startsWith("/settings")) return true;
  if (p === "/billing" || p.startsWith("/billing/")) return true;
  if (p === "/dashboard" || p.startsWith("/dashboard/")) return true;
  return false;
}
