export const JWT_COOKIE_NAME = "whatsapp_platform_token";

/** Duração do access token + linha de sessão em DB (horas). Default 12h — equilíbrio segurança vs UX SaaS. */
export function getAccessTokenHours(): number {
  const raw = process.env.JWT_ACCESS_HOURS ?? process.env.JWT_EXPIRY_HOURS;
  if (raw === undefined || raw === "") return 12;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1 || n > 168) return 12;
  return Math.floor(n);
}

export function getAccessTokenMaxAgeSeconds(): number {
  return getAccessTokenHours() * 60 * 60;
}

export function getAccessTokenExpiryDate(): Date {
  return new Date(Date.now() + getAccessTokenHours() * 60 * 60 * 1000);
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is required");
  return secret;
}

export function getCookieDomain(): string {
  return process.env.COOKIE_DOMAIN ?? "";
}
