import { FINANCEIRO_BASE_PATH } from "./constants";

/** Landing pública ou árvore de demo — permanecem no portal (Bloco C). */
export function isFinanceiroLandingOrDemoPath(pathname: string): boolean {
  if (pathname === FINANCEIRO_BASE_PATH || pathname === `${FINANCEIRO_BASE_PATH}/`) return true;
  if (pathname.startsWith(`${FINANCEIRO_BASE_PATH}/demo`)) return true;
  return false;
}

/** Rotas operacionais do produto (não servidas no portal após cutover). */
export function isFinanceiroOperationalPath(pathname: string): boolean {
  if (!pathname.startsWith(FINANCEIRO_BASE_PATH)) return false;
  return !isFinanceiroLandingOrDemoPath(pathname);
}

/** Billing / upgrade Financeiro na raiz — canónico no app (Bloco D). */
export function isFinanceiroPortalBillingOrUpgradePath(pathname: string): boolean {
  return (
    pathname === "/billing" ||
    pathname.startsWith("/billing/") ||
    pathname === "/upgrade" ||
    pathname.startsWith("/upgrade/")
  );
}

function urlsEquivalent(a: URL, b: URL): boolean {
  return a.origin === b.origin && a.pathname === b.pathname && a.search === b.search;
}

/** Resolve path (+ query opcional em `pathnameWithSearch`) no host canônico do app Financeiro. */
export function resolveFinanceiroAppUrl(pathnameWithSearch: string): URL | null {
  const raw = process.env.NEXT_PUBLIC_FINANCEIRO_APP_URL?.trim();
  if (!raw) return null;
  try {
    return new URL(pathnameWithSearch, raw);
  } catch {
    return null;
  }
}

/** Request mínimo para redirects (compatível com `NextRequest`). */
export type FinanceiroRedirectRequest = {
  nextUrl: URL;
  url: string;
};

/**
 * Onde o utilizador deve ir ao sair da landing autenticado (cookie de última rota).
 * Se existir app canónico e o destino for operacional, usa o host do app; senão mantém o request atual.
 */
export function resolveFinanceiroResumeRedirectUrl(
  targetPath: string,
  request: FinanceiroRedirectRequest
): URL {
  const canonical = resolveFinanceiroAppUrl(targetPath);
  if (
    canonical &&
    (isFinanceiroOperationalPath(targetPath) || isFinanceiroPortalBillingOrUpgradePath(targetPath)) &&
    !urlsEquivalent(canonical, request.nextUrl)
  ) {
    return canonical;
  }
  return new URL(targetPath, request.url);
}

/**
 * Bloco B/C/D (cutover): operacional + billing/upgrade no app canônico (`NEXT_PUBLIC_FINANCEIRO_APP_URL`), path + query iguais.
 * Não redireciona se o destino for equivalente ao URL atual (evita loop quando env = mesmo host que o portal).
 */
export function getFinanceiroCutoverRedirectUrl(request: FinanceiroRedirectRequest): URL | null {
  if (!process.env.NEXT_PUBLIC_FINANCEIRO_APP_URL?.trim()) return null;

  const pathname = request.nextUrl.pathname;
  const isCutoverTarget =
    isFinanceiroOperationalPath(pathname) || isFinanceiroPortalBillingOrUpgradePath(pathname);
  if (!isCutoverTarget) return null;

  const pathnameWithSearch = `${pathname}${request.nextUrl.search}`;
  const target = resolveFinanceiroAppUrl(pathnameWithSearch);
  if (!target) return null;
  if (urlsEquivalent(target, request.nextUrl)) return null;
  return target;
}
