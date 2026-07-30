/**
 * Active-match helpers for shell sidebar (expandida + rail).
 * Prefix match with exact exceptions for /dashboard and /settings
 * so parent items do not stay selected on child routes.
 */

export function normalizeNavPath(path: string): string {
  const p = path.split("?")[0] ?? path;
  if (p.length > 1 && p.endsWith("/")) return p.slice(0, -1);
  return p || "/";
}

export function navIsActive(pathname: string, href: string): boolean {
  const p = normalizeNavPath(pathname);
  const h = normalizeNavPath(href);

  if (h === "/dashboard") return p === "/dashboard";
  if (h === "/settings") return p === "/settings";

  return p === h || p.startsWith(`${h}/`);
}
