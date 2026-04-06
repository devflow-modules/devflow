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

/** Resolve path (+ query) no host canônico do app WhatsApp. */
export function resolveWhatsappAppUrl(pathnameWithSearch: string): URL | null {
  const raw = process.env.NEXT_PUBLIC_WHATSAPP_APP_URL?.trim();
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
 */
export function getWhatsappCutoverRedirectUrl(request: WhatsappRedirectRequest): URL | null {
  if (!process.env.NEXT_PUBLIC_WHATSAPP_APP_URL?.trim()) return null;

  const pathname = request.nextUrl.pathname;
  if (isWhatsappLandingOrPublicPath(pathname)) return null;
  if (!isWhatsappPortalOperationalUiPath(pathname)) return null;

  const pathnameWithSearch = `${pathname}${request.nextUrl.search}`;
  const target = resolveWhatsappAppUrl(pathnameWithSearch);
  if (!target) return null;
  if (urlsEquivalent(target, request.nextUrl)) return null;
  return target;
}
