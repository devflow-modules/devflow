import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { JWT_COOKIE_NAME } from "@/lib/auth-config";

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

async function jwtCookieValid(): Promise<boolean> {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) return false;
  let token: string | undefined;
  try {
    const store = await cookies();
    token = store.get(JWT_COOKIE_NAME)?.value;
  } catch {
    return false;
  }
  if (!token) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(jwtSecret));
    return true;
  } catch {
    return false;
  }
}

/** Acesso às rotas /api/admin/leads: dev livre; prod = header de métricas admin ou JWT do portal. */
export async function isAdminLeadsApiAllowed(request: Request): Promise<boolean> {
  if (process.env.NODE_ENV === "development") return true;
  if (metricsSecretMatches(request)) return true;
  if (await adminMetricsCookieValid()) return true;
  return jwtCookieValid();
}
