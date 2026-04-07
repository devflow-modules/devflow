/**
 * Aceita só o e-mail (ex.: noreply@dominio.com) ou já no formato `Nome <email>`.
 * E-mail simples vira `Nome <email>` usando RESEND_FROM_NAME ou default.
 */
export function formatResendFromAddress(raw: string): string {
  const t = raw.trim().replace(/^["']+|["']+$/g, "");
  if (!t) return t;
  const looksLikeNameEmailPair = /<[^<>]*@[^<>]*>/.test(t);
  if (looksLikeNameEmailPair) return t;
  const plainEmail = /^[^\s<>]+@[^\s<>]+\.[^\s<>]+$/i.test(t);
  if (plainEmail) {
    const name = (process.env.RESEND_FROM_NAME ?? "DevFlow").trim() || "DevFlow";
    return `${name} <${t}>`;
  }
  return t;
}
