import { JWT_COOKIE_NAME, getCookieDomain } from "@/lib/auth-config";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 24 * 60 * 60,
  path: "/",
};

export function getTokenFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";").map((p) => p.trim());
  const prefix = `${JWT_COOKIE_NAME}=`;
  for (const part of parts) {
    if (part.startsWith(prefix)) return part.slice(prefix.length);
  }
  return null;
}

export function buildSetCookieHeader(token: string): string {
  const domain = getCookieDomain();
  let value = `${JWT_COOKIE_NAME}=${token}; Path=${COOKIE_OPTIONS.path}; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_OPTIONS.maxAge}`;
  if (COOKIE_OPTIONS.secure) value += "; Secure";
  if (domain) value += `; Domain=${domain}`;
  return value;
}

export function buildClearCookieHeader(): string {
  const domain = getCookieDomain();
  let value = `${JWT_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
  if (domain) value += `; Domain=${domain}`;
  return value;
}
