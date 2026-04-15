/** Base pública do app (WhatsApp Platform). */
export function getWhatsappAppPublicBaseUrl(): string {
  const raw =
    (typeof process !== "undefined" &&
      (process.env.NEXT_PUBLIC_WHATSAPP_APP_URL ?? process.env.NEXT_PUBLIC_APP_URL)) ||
    "";
  return raw.replace(/\/$/, "").trim();
}

/** Link completo de cadastro com tracking de afiliado (CUID). */
export function buildAffiliateSignupLink(affiliateId: string, baseUrlOverride?: string): string {
  const base = (baseUrlOverride ?? getWhatsappAppPublicBaseUrl()).replace(/\/$/, "");
  if (!base) return `/signup?ref=${encodeURIComponent(affiliateId)}`;
  return `${base}/signup?ref=${encodeURIComponent(affiliateId)}`;
}
