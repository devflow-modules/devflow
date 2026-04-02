/**
 * URLs absolutas do deploy canónico do Financeiro (`NEXT_PUBLIC_FINANCEIRO_APP_URL`).
 * Sem env, devolve o path relativo (útil com 308 no portal ou monólito legado).
 */
export function financeiroAppUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const base = process.env.NEXT_PUBLIC_FINANCEIRO_APP_URL?.replace(/\/$/, "") ?? "";
  return base ? `${base}${normalized}` : normalized;
}
