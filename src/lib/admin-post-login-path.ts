import { isSafePortalNextPathForWhatsappLogin } from "@/lib/portal-whatsapp-login-url";

const DEFAULT_ADMIN_LANDING = "/admin/metrics";

/**
 * Destino seguro após `POST /api/admin/login` no portal.
 * Só permite rotas internas sob `/admin/` (exclui login), com as mesmas regras que `next` no login WhatsApp.
 */
export function safePortalAdminPostLoginPath(next: string | null | undefined): string {
  if (typeof next !== "string" || !next.startsWith("/admin/")) return DEFAULT_ADMIN_LANDING;
  if (next.startsWith("/admin/login")) return DEFAULT_ADMIN_LANDING;
  if (!isSafePortalNextPathForWhatsappLogin(next)) return DEFAULT_ADMIN_LANDING;
  return next;
}
