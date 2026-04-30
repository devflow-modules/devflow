import { cookies } from "next/headers";
import { getCrmWhatsappSessionFromCookies, getCrmWhatsappSessionFromRequest } from "@/lib/crm-whatsapp-auth";

const ADMIN_METRICS_COOKIE = "admin_metrics_secret";

function metricsSecretMatches(request: Request): boolean {
  const secret =
    process.env.ADMIN_METRICS_SECRET ?? process.env.WHATSAPP_ADMIN_METRICS_SECRET;
  if (!secret) return false;
  return request.headers.get("x-admin-metrics-secret") === secret;
}

async function adminMetricsCookieValid(): Promise<boolean> {
  try {
    const secret = process.env.WHATSAPP_ADMIN_METRICS_SECRET ?? process.env.ADMIN_METRICS_SECRET;
    if (!secret) return false;
    const store = await cookies();
    return store.get(ADMIN_METRICS_COOKIE)?.value === secret;
  } catch {
    return false;
  }
}

async function jwtPlatformAdminSession(request: Request): Promise<boolean> {
  const fromCookies = await getCrmWhatsappSessionFromCookies();
  if (fromCookies?.role === "platform_admin") return true;
  const fromReq = await getCrmWhatsappSessionFromRequest(request);
  return fromReq?.role === "platform_admin";
}

/**
 * Acesso às rotas `/api/admin/leads`:
 * - **dev**: permitido (fluxo local).
 * - **prod**: segredo métricas admin (Ops legado) **ou** sessão JWT `platform_admin` (WhatsApp Platform).
 */
export async function isAdminLeadsApiAllowed(request: Request): Promise<boolean> {
  if (process.env.NODE_ENV === "development") return true;
  if (metricsSecretMatches(request)) return true;
  if (await adminMetricsCookieValid()) return true;
  return jwtPlatformAdminSession(request);
}
