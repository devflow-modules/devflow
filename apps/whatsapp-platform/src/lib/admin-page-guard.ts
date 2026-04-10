import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_METRICS_SECRET_COOKIE_NAME, JWT_COOKIE_NAME } from "@/lib/auth-config";
import { validateAuthToken } from "@/modules/auth";
import { isPlatformAdmin, shellHomeHref } from "@/lib/roles";

/** Alinhado ao middleware: bypass em produção com cookie de segredo (métricas/billing admin). */
export async function readMetricsSecretBypass(): Promise<boolean> {
  if (process.env.NODE_ENV !== "production") return false;
  const secret = process.env.WHATSAPP_ADMIN_METRICS_SECRET ?? process.env.ADMIN_METRICS_SECRET;
  if (!secret) return false;
  const store = await cookies();
  return store.get(ADMIN_METRICS_SECRET_COOKIE_NAME)?.value === secret;
}

/** Páginas `/admin/metrics` e `/admin/billing`: segredo (prod) ou JWT com role `platform_admin`. */
export async function requireAdminOrMetricsSecretPage(nextPath: string): Promise<void> {
  if (await readMetricsSecretBypass()) return;
  const store = await cookies();
  const token = store.get(JWT_COOKIE_NAME)?.value;
  const auth = token ? await validateAuthToken(token) : null;
  if (!auth) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  if (!isPlatformAdmin(auth.payload.role)) {
    redirect(shellHomeHref(auth.payload.role));
  }
}

/** Páginas internas da plataforma (ex.: `/admin/agents`) — só `platform_admin`. */
export async function requireJwtAdminPage(nextPath: string): Promise<void> {
  const store = await cookies();
  const token = store.get(JWT_COOKIE_NAME)?.value;
  const auth = token ? await validateAuthToken(token) : null;
  if (!auth) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  if (!isPlatformAdmin(auth.payload.role)) {
    redirect(shellHomeHref(auth.payload.role));
  }
}
