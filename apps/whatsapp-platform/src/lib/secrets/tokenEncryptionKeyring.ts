/**
 * Loads Meta token encryption keyring from environment (SEC-1a).
 * Keys are base64-encoded 32-byte values. Never log key material.
 */

import {
  TOKEN_ENCRYPTION_KEY_BYTES,
  TokenEncryptionError,
  type TokenKeyMaterial,
  type TokenKeyring,
} from "./tokenEncryption";

function decodeBase64Key(raw: string, label: string): Buffer {
  let buf: Buffer;
  try {
    buf = Buffer.from(raw.trim(), "base64");
  } catch {
    throw new TokenEncryptionError("ENCRYPTION_KEY_MISSING", `${label} is not valid base64`);
  }
  if (buf.length !== TOKEN_ENCRYPTION_KEY_BYTES) {
    throw new TokenEncryptionError(
      "ENCRYPTION_KEY_MISSING",
      `${label} must decode to exactly ${TOKEN_ENCRYPTION_KEY_BYTES} bytes`
    );
  }
  return buf;
}

function readKeyMaterial(
  keyEnv: string | undefined,
  keyIdEnv: string | undefined,
  label: string
): TokenKeyMaterial | null {
  const keyRaw = keyEnv?.trim();
  const keyId = keyIdEnv?.trim();
  if (!keyRaw && !keyId) return null;
  if (!keyRaw || !keyId) {
    throw new TokenEncryptionError(
      "ENCRYPTION_KEY_MISSING",
      `${label} key and keyId must both be set or both omitted`
    );
  }
  return { keyId, key: decodeBase64Key(keyRaw, label) };
}

/**
 * Returns null when encryption is not configured (legacy plaintext read still allowed).
 * Throws TokenEncryptionError when configuration is partial or invalid.
 */
export function loadTokenEncryptionKeyringFromEnv(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env
): TokenKeyring | null {
  const current = readKeyMaterial(
    env.WHATSAPP_TOKEN_ENCRYPTION_KEY,
    env.WHATSAPP_TOKEN_ENCRYPTION_KEY_ID,
    "WHATSAPP_TOKEN_ENCRYPTION"
  );
  if (!current) {
    const previousAlone = readKeyMaterial(
      env.WHATSAPP_TOKEN_ENCRYPTION_PREVIOUS_KEY,
      env.WHATSAPP_TOKEN_ENCRYPTION_PREVIOUS_KEY_ID,
      "WHATSAPP_TOKEN_ENCRYPTION_PREVIOUS"
    );
    if (previousAlone) {
      throw new TokenEncryptionError(
        "ENCRYPTION_KEY_MISSING",
        "Previous encryption key cannot be set without current key"
      );
    }
    return null;
  }

  const previous = readKeyMaterial(
    env.WHATSAPP_TOKEN_ENCRYPTION_PREVIOUS_KEY,
    env.WHATSAPP_TOKEN_ENCRYPTION_PREVIOUS_KEY_ID,
    "WHATSAPP_TOKEN_ENCRYPTION_PREVIOUS"
  );

  if (previous && previous.keyId === current.keyId) {
    throw new TokenEncryptionError(
      "ENCRYPTION_KEY_MISSING",
      "current and previous keyIds must differ"
    );
  }

  return previous ? { current, previous } : { current };
}

/** Convenience for app code — same as loadTokenEncryptionKeyringFromEnv(). */
export function getTokenEncryptionKeyring(): TokenKeyring | null {
  return loadTokenEncryptionKeyringFromEnv();
}
