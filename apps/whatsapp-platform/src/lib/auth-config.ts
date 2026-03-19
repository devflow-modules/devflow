export const JWT_COOKIE_NAME = "whatsapp_platform_token";
export const JWT_EXPIRY_HOURS = 24;

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is required");
  return secret;
}

export function getCookieDomain(): string {
  return process.env.COOKIE_DOMAIN ?? "";
}
