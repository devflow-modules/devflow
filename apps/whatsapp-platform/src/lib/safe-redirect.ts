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

/** Checkout alojado na Stripe (resposta típica de `redirectUrl` no signup). */
export function isTrustedStripeCheckoutRedirectUrl(href: string): boolean {
  try {
    const u = new URL(href);
    return u.protocol === "https:" && u.hostname === "checkout.stripe.com";
  } catch {
    return false;
  }
}

/**
 * Destino seguro após signup bem-sucedido (defesa em profundidade no cliente).
 * Preferência: `redirectUrl` só se for checkout Stripe; senão `redirectTo` se path interno seguro; senão `/onboarding`.
 */
export function resolveSignupClientNavigationHref(data: {
  redirectUrl?: string;
  redirectTo?: string;
}): string {
  if (typeof data.redirectUrl === "string" && isTrustedStripeCheckoutRedirectUrl(data.redirectUrl)) {
    return data.redirectUrl;
  }
  if (typeof data.redirectTo === "string" && isSafeInternalNextPath(data.redirectTo)) {
    return data.redirectTo;
  }
  return "/onboarding";
}
