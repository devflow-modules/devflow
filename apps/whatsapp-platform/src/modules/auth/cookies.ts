import { JWT_COOKIE_NAME, getAccessTokenMaxAgeSeconds, getCookieDomain } from "@/lib/auth-config";

function cookieSecure(): boolean {
  if (process.env.COOKIE_SECURE === "false") return false;
  if (process.env.COOKIE_SECURE === "true") return true;
  return process.env.NODE_ENV === "production";
}

const COOKIE_OPTIONS = {
  httpOnly: true,
  get secure() {
    return cookieSecure();
  },
  sameSite: "lax" as const,
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
  const maxAge = getAccessTokenMaxAgeSeconds();
  let value = `${JWT_COOKIE_NAME}=${token}; Path=${COOKIE_OPTIONS.path}; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
  if (cookieSecure()) value += "; Secure";
  if (domain) value += `; Domain=${domain}`;
  return value;
}

export function buildClearCookieHeader(): string {
  const domain = getCookieDomain();
  let value = `${JWT_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
  if (cookieSecure()) value += "; Secure";
  if (domain) value += `; Domain=${domain}`;
  return value;
}
