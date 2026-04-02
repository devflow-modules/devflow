/**
 * Href para o app Financeiro canónico (Bloco D).
 * Com `NEXT_PUBLIC_FINANCEIRO_APP_URL`, devolve URL absoluta (links diretos ao app).
 * Sem env, mantém path relativo ao portal (ex.: dev monolito).
 */
export function financeiroAppHref(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const raw = process.env.NEXT_PUBLIC_FINANCEIRO_APP_URL?.trim();
  if (!raw) return normalized;
  try {
    return new URL(normalized, raw.endsWith("/") ? raw : `${raw}/`).href;
  } catch {
    return normalized;
  }
}
