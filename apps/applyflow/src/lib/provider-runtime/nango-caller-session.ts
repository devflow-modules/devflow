import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Anonymous browser caller session for Nango routes.
 *
 * This cookie isolates connections per browser session. It is not a user login,
 * SSO proof, or account identity. Connect may mint it; other routes only accept
 * a valid existing cookie.
 *
 * Payload: `v1.{nonce}.{expiresAt}.{hmac}` where hmac = HMAC-SHA256(secret, `v1:{nonce}:{expiresAt}`).
 * `expiresAt` is a unix-seconds integer. Expired or malformed cookies are rejected
 * on the server even if the browser still sends them.
 *
 * When the cookie expires or is lost, Connect mints a new nonce. Previous Nango
 * connections stay tagged to the old `end_user_id` and are not listed, read, or
 * disconnected from the new identity. There is no fallback to
 * `applyflow-*-runtime-boundary`.
 */

export const NANGO_CALLER_COOKIE_NAME = "af_nango_caller";
export const NANGO_CALLER_COOKIE_PATH = "/provider-runtime/nango";
export const NANGO_CALLER_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
export const NANGO_CALLER_NONCE_PATTERN = /^[a-f0-9]{32}$/;

const CALLER_COOKIE_PATTERN = /^v1\.([a-f0-9]{32})\.(\d{10,16})\.([a-f0-9]{64})$/;
const MAX_FUTURE_EXPIRY_SKEW_SECONDS = 60;

export type NangoCallerSession = {
  nonce: string;
  expiresAt: number;
};

export type MintNangoCallerSessionOptions = {
  secure?: boolean;
  now?: number;
  nonce?: string;
};

function unixNow(now?: number): number {
  return now ?? Math.floor(Date.now() / 1000);
}

function signCallerValue(nonce: string, expiresAt: number, secret: string): string {
  return createHmac("sha256", secret).update(`v1:${nonce}:${expiresAt}`).digest("hex");
}

function serializeCallerValue(nonce: string, expiresAt: number, secret: string): string {
  return `v1.${nonce}.${expiresAt}.${signCallerValue(nonce, expiresAt, secret)}`;
}

function readCookieValue(cookieHeader: string, name: string): string | undefined {
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const [cookieName, ...rest] = part.trim().split("=");
    if (cookieName === name) {
      return rest.join("=");
    }
  }
  return undefined;
}

function macsEqual(provided: string, expected: string): boolean {
  const providedBuffer = Buffer.from(provided, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  if (providedBuffer.length === 0 || providedBuffer.length !== expectedBuffer.length) {
    return false;
  }
  return timingSafeEqual(providedBuffer, expectedBuffer);
}

export function parseNangoCallerCookie(
  cookieHeader: string | null | undefined,
  secret: string,
  now?: number,
): NangoCallerSession | null {
  const trimmedSecret = secret.trim();
  if (!cookieHeader || !trimmedSecret) {
    return null;
  }

  const raw = readCookieValue(cookieHeader, NANGO_CALLER_COOKIE_NAME);
  if (!raw) {
    return null;
  }

  const match = CALLER_COOKIE_PATTERN.exec(raw);
  if (!match) {
    return null;
  }

  const nonce = match[1];
  const expiresAtRaw = match[2];
  const provided = match[3];
  if (!nonce || !expiresAtRaw || !provided) {
    return null;
  }

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isSafeInteger(expiresAt)) {
    return null;
  }

  const currentTime = unixNow(now);
  if (expiresAt <= currentTime) {
    return null;
  }
  if (expiresAt > currentTime + NANGO_CALLER_COOKIE_MAX_AGE_SECONDS + MAX_FUTURE_EXPIRY_SKEW_SECONDS) {
    return null;
  }

  const expected = signCallerValue(nonce, expiresAt, trimmedSecret);
  if (!macsEqual(provided, expected)) {
    return null;
  }

  return { nonce, expiresAt };
}

export function mintNangoCallerSession(
  secret: string,
  options?: MintNangoCallerSessionOptions,
): { nonce: string; expiresAt: number; cookieHeader: string; setCookie: string } {
  const now = unixNow(options?.now);
  const nonce = options?.nonce && NANGO_CALLER_NONCE_PATTERN.test(options.nonce)
    ? options.nonce
    : randomBytes(16).toString("hex");
  const expiresAt = now + NANGO_CALLER_COOKIE_MAX_AGE_SECONDS;
  const value = serializeCallerValue(nonce, expiresAt, secret.trim());
  const cookieHeader = `${NANGO_CALLER_COOKIE_NAME}=${value}`;
  const secure = options?.secure === true;
  const setCookie = [
    cookieHeader,
    `Path=${NANGO_CALLER_COOKIE_PATH}`,
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${NANGO_CALLER_COOKIE_MAX_AGE_SECONDS}`,
    ...(secure ? ["Secure"] : []),
  ].join("; ");

  return { nonce, expiresAt, cookieHeader, setCookie };
}
