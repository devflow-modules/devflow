/**
 * Href para o app Financeiro canónico (Bloco D).
 * Com `NEXT_PUBLIC_FINANCEIRO_APP_URL`, devolve URL absoluta (links diretos ao app).
 * Sem env, mantém path relativo ao portal (ex.: dev monolito).
 *
 * Rejeita pathnames que fariam `new URL(path, base)` resolver para outro host
 * (ex.: `//evil.com/...` ou `/https://evil.com/...`).
 */
function splitPathAndQuery(value: string): { pathOnly: string; querySuffix: string } {
  const i = value.indexOf("?");
  if (i === -1) return { pathOnly: value, querySuffix: "" };
  return { pathOnly: value.slice(0, i), querySuffix: value.slice(i) };
}

/** Path com scheme absoluto embutido (ex.: `/https://evil.com/…`), não só segmentos normais. */
function hasEmbeddedAbsoluteScheme(pathOnly: string): boolean {
  return /^\/[a-zA-Z][\w+.-]*:\/\//.test(pathOnly);
}

export function financeiroAppHref(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const raw = process.env.NEXT_PUBLIC_FINANCEIRO_APP_URL?.trim();
  if (!raw) return normalized;

  const { pathOnly, querySuffix } = splitPathAndQuery(normalized);

  if (hasEmbeddedAbsoluteScheme(pathOnly)) {
    return normalized;
  }

  let pathForResolve = pathOnly;
  if (pathForResolve.startsWith("//")) {
    pathForResolve = `/${pathForResolve.replace(/^\/+/, "")}`;
  }
  if (hasEmbeddedAbsoluteScheme(pathForResolve)) {
    return normalized;
  }

  const pathWithQuery = pathForResolve + querySuffix;

  try {
    return new URL(pathWithQuery, raw.endsWith("/") ? raw : `${raw}/`).href;
  } catch {
    return normalized;
  }
}
