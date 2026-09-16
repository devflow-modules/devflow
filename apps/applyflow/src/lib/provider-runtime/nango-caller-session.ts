import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const NANGO_CALLER_COOKIE_NAME = "af_nango_caller";
export const NANGO_CALLER_COOKIE_PATH = "/provider-runtime/nango";
export const NANGO_CALLER_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
export const NANGO_CALLER_NONCE_PATTERN = /^[a-f0-9]{32}$/;

export type NangoCallerSession = {
  nonce: string;
};

function signCallerNonce(nonce: string, secret: string): string {
  return createHmac("sha256", secret).update(`v1:${nonce}`).digest("hex");
}

function serializeCallerValue(nonce: string, secret: string): string {
  return `v1.${nonce}.${signCallerNonce(nonce, secret)}`;
}

export function parseNangoCallerCookie(
  cookieHeader: string | null | undefined,
  secret: string,
): NangoCallerSession | null {
  const trimmedSecret = secret.trim();
  if (!cookieHeader || !trimmedSecret) {
    return null;
  }

  const parts = cookieHeader.split(";");
  let raw: string | undefined;
  for (const part of parts) {
    const [name, ...rest] = part.trim().split("=");
    if (name === NANGO_CALLER_COOKIE_NAME) {
      raw = rest.join("=");
      break;
    }
  }
  if (!raw) {
    return null;
  }

  const match = /^v1\.([a-f0-9]{32})\.([a-f0-9]{64})$/.exec(raw);
  if (!match) {
    return null;
  }

  const nonce = match[1];
  const provided = match[2];
  if (!nonce || !provided) {
    return null;
  }

  const expected = signCallerNonce(nonce, trimmedSecret);
  const providedBuffer = Buffer.from(provided, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  if (providedBuffer.length !== expectedBuffer.length) {
    return null;
  }
  if (!timingSafeEqual(providedBuffer, expectedBuffer)) {
    return null;
  }

  return { nonce };
}

export function mintNangoCallerSession(
  secret: string,
  options?: { secure?: boolean },
): { nonce: string; cookieHeader: string; setCookie: string } {
  const nonce = randomBytes(16).toString("hex");
  const value = serializeCallerValue(nonce, secret.trim());
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

  return { nonce, cookieHeader, setCookie };
}
