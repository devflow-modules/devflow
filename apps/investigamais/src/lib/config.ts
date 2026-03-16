export const APP_PRODUCT_SLUG = "investigamais";

export const JWT_COOKIE_NAME = "investiga_token";
export const JWT_EXPIRY_HOURS = 24;

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is required");
  return secret;
}

export function getReceitaWsBaseUrl(): string {
  return process.env.RECEITAWS_API_URL ?? "https://receitaws.com.br/v1";
}

export function getCookieDomain(): string | undefined {
  return process.env.COOKIE_DOMAIN;
}
