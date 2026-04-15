import { z } from "zod";

export const AFFILIATE_REF_COOKIE_NAME = "affiliate_ref";

/** 7 dias — alinhado ao pedido de tracking comercial. */
export const AFFILIATE_REF_MAX_AGE_SEC = 604800;

const cuidSchema = z.string().cuid();

export function isValidAffiliateRefId(id: string): boolean {
  return cuidSchema.safeParse(id.trim()).success;
}

/**
 * Preferência: corpo do pedido; fallback cookie (resiliente se o submit não enviar o campo).
 */
export function resolveSignupAffiliateRef(
  bodyRef: string | undefined,
  cookieRef: string | undefined
): { id: string | null; via: "body" | "cookie" | null } {
  const b = bodyRef?.trim();
  if (b && isValidAffiliateRefId(b)) return { id: b, via: "body" };
  const c = cookieRef?.trim();
  if (c && isValidAffiliateRefId(c)) return { id: c, via: "cookie" };
  return { id: null, via: null };
}

/** Linha Set-Cookie para limpar após signup bem-sucedido (evita ref stale no mesmo browser). */
export function buildClearAffiliateRefCookie(): string {
  return `${AFFILIATE_REF_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function clientSetAffiliateRefCookie(id: string): void {
  if (typeof document === "undefined" || !isValidAffiliateRefId(id)) return;
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  const v = encodeURIComponent(id.trim());
  document.cookie = `${AFFILIATE_REF_COOKIE_NAME}=${v}; Path=/; Max-Age=${AFFILIATE_REF_MAX_AGE_SEC}; SameSite=Lax${secure}`;
}

export function clientReadAffiliateRefCookie(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const parts = document.cookie.split(";").map((p) => p.trim());
  for (const p of parts) {
    if (!p.startsWith(`${AFFILIATE_REF_COOKIE_NAME}=`)) continue;
    const raw = p.slice(AFFILIATE_REF_COOKIE_NAME.length + 1);
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return undefined;
}
