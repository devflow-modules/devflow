import { isSafeInternalNextPath, resolveLoginRedirect } from "@/lib/safe-redirect";
import { isAdmin } from "@/lib/roles";

const ADMIN_DEFAULT = "/dashboard/whatsapp";
const AGENT_DEFAULT = "/inbox";

/**
 * Destino após login ou sessão já válida em `/login`.
 * Agentes não devem cair em onboarding nem em rotas de configuração.
 */
export function resolvePostLoginRedirect(
  next: string | null | undefined,
  role: string | null | undefined
): string {
  if (isAdmin(role)) {
    return resolveLoginRedirect(next ?? null, ADMIN_DEFAULT);
  }

  if (typeof next === "string" && isSafeInternalNextPath(next) && !isPathBlockedForAgentAfterLogin(next)) {
    return next;
  }

  return AGENT_DEFAULT;
}

function isPathBlockedForAgentAfterLogin(path: string): boolean {
  const p = path.split("?")[0] ?? path;
  if (p === "/onboarding" || p.startsWith("/onboarding/")) return true;
  if (p.startsWith("/settings")) return true;
  if (p === "/billing" || p.startsWith("/billing/")) return true;
  if (p === "/dashboard/whatsapp" || p.startsWith("/dashboard/whatsapp/")) return true;
  return false;
}
