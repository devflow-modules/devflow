/**
 * Evita open redirect: só paths relativos internos (sem protocolo, sem //).
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

export function resolveLoginRedirect(next: string | null | undefined, fallback: string): string {
  if (typeof next === "string" && isSafeInternalNextPath(next)) return next;
  return fallback;
}

/** URL de login com `?next=` apenas se o destino for path interno seguro. */
export function loginUrlWithNext(next: string | null | undefined): string {
  if (typeof next === "string" && isSafeInternalNextPath(next)) {
    return `/login?next=${encodeURIComponent(next)}`;
  }
  return "/login";
}
