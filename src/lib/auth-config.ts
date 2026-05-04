export const JWT_COOKIE_NAME = "whatsapp_platform_token";
/** Cookie HTTP-only definido por `POST /api/admin/login` (portal e apps alinhados ao middleware). */
export const ADMIN_METRICS_SECRET_COOKIE_NAME = "admin_metrics_secret";
export const JWT_EXPIRY_HOURS = 24;

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is required");
  return secret;
}

export function getCookieDomain(): string {
  return process.env.COOKIE_DOMAIN ?? "";
}
