/**
 * Avoid open redirects: only relative internal paths (no protocol, no //).
 * Mirrors the DevFlow redirect-safety contract used by other apps.
 */
export function isSafeInternalNextPath(next: string): boolean {
  if (next.length === 0 || next !== next.trim()) return false;
  if (/\s/.test(next)) return false;
  if (!next.startsWith("/")) return false;
  if (next.startsWith("//")) return false;
  if (next.includes("\\") || next.includes("\0")) return false;
  const firstSeg = next.split("/")[1] ?? "";
  if (firstSeg.includes(":")) return false;
  return true;
}

export const DEFAULT_POST_AUTH_PATH = "/account";

export function resolveAuthRedirect(
  next: string | null | undefined,
  fallback: string = DEFAULT_POST_AUTH_PATH,
): string {
  if (typeof next === "string" && isSafeInternalNextPath(next)) return next;
  return fallback;
}

export function buildAuthCallbackUrl(origin: string, next: string | null | undefined): string {
  const safeNext = resolveAuthRedirect(next);
  const url = new URL("/auth/callback", origin);
  url.searchParams.set("next", safeNext);
  return url.toString();
}
