import { isWhatsappLandingOrPublicPath } from "./landing";
import { WHATSAPP_PORTAL_CUTOVER_REDIRECT_PREFIXES } from "./constants";

function normalizePath(pathname: string): string {
  if (pathname !== "/" && pathname.endsWith("/")) return pathname.slice(0, -1) || "/";
  return pathname || "/";
}

function urlsEquivalent(a: URL, b: URL): boolean {
  return a.origin === b.origin && a.pathname === b.pathname && a.search === b.search;
}

/** Path no portal que deve ser servido pelo app WhatsApp após cutover (UI + auth + admin do produto). */
export function isWhatsappPortalOperationalUiPath(pathname: string): boolean {
  const path = normalizePath(pathname);
  return WHATSAPP_PORTAL_CUTOVER_REDIRECT_PREFIXES.some(
    (p) => path === p || path.startsWith(`${p}/`)
  );
}

/** Base URL do app WhatsApp (override evita depender de `process.env` só dentro do pacote no bundle Edge). */
function resolveWhatsappAppBaseUrl(appBaseOverride?: string | null): string {
  const fromOverride = appBaseOverride?.trim();
  if (fromOverride) return fromOverride.replace(/\/$/, "");
  const fromEnv = process.env.NEXT_PUBLIC_WHATSAPP_APP_URL?.trim() ?? "";
  return fromEnv.replace(/\/$/, "");
}

/** Resolve path (+ query) no host canônico do app WhatsApp. */
export function resolveWhatsappAppUrl(
  pathnameWithSearch: string,
  appBaseOverride?: string | null
): URL | null {
  const raw = resolveWhatsappAppBaseUrl(appBaseOverride);
  if (!raw) return null;
  try {
    return new URL(pathnameWithSearch, raw);
  } catch {
    return null;
  }
}

export type WhatsappRedirectRequest = {
  nextUrl: URL;
  url: string;
};

/**
 * Cutover WhatsApp: UI operacional + auth + admin métricas/billing do produto no app canônico.
 * Não redireciona landings/SEO nem se origem = destino (evita loop).
 *
 * Passe `appBaseOverride` desde `src/middleware.ts` (mesma leitura de `NEXT_PUBLIC_WHATSAPP_APP_URL`)
 * para o valor ser inlined no chunk Edge do middleware.
 */
export function getWhatsappCutoverRedirectUrl(
  request: WhatsappRedirectRequest,
  appBaseOverride?: string | null
): URL | null {
  if (!resolveWhatsappAppBaseUrl(appBaseOverride)) return null;

  const pathname = request.nextUrl.pathname;
  if (isWhatsappLandingOrPublicPath(pathname)) return null;
  if (!isWhatsappPortalOperationalUiPath(pathname)) return null;

  const pathnameWithSearch = `${pathname}${request.nextUrl.search}`;
  const target = resolveWhatsappAppUrl(pathnameWithSearch, appBaseOverride);
  if (!target) return null;
  if (urlsEquivalent(target, request.nextUrl)) return null;
  return target;
}
