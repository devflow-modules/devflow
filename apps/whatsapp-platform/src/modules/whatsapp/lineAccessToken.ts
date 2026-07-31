/**
 * Dual-read / dual-write helpers for WhatsAppPhoneNumber Meta access tokens (SEC-1a).
 *
 * Dual-write still stores plaintext temporarily for rollback compatibility — it does NOT
 * eliminate at-rest risk until SEC-1c/d remove the legacy field.
 */

import {
  decryptSecret,
  encryptSecret,
  isEncryptedSecret,
  TokenEncryptionError,
  type TokenKeyring,
} from "@/lib/secrets/tokenEncryption";
import { getTokenEncryptionKeyring } from "@/lib/secrets/tokenEncryptionKeyring";

export type LineAccessTokenFields = {
  accessToken: string | null;
  accessTokenEncrypted: string | null;
};

export type LineAccessTokenSource = "encrypted" | "legacy_plaintext";

export type ResolveLineAccessTokenSuccess = {
  ok: true;
  token: string;
  source: LineAccessTokenSource;
};

export type ResolveLineAccessTokenFailure = {
  ok: false;
  code:
    | "CREDENTIAL_UNAVAILABLE"
    | "CREDENTIAL_DECRYPT_FAILED"
    | "ENCRYPTION_KEY_MISSING"
    | "UNSUPPORTED_CREDENTIAL_VERSION"
    | "INVALID_ENCRYPTED_CREDENTIAL";
};

export type ResolveLineAccessTokenResult =
  | ResolveLineAccessTokenSuccess
  | ResolveLineAccessTokenFailure;

/** Presence check without decryption (safe for hasToken / admin lists). */
export function hasStoredLineAccessToken(row: LineAccessTokenFields): boolean {
  return Boolean(row.accessTokenEncrypted?.trim() || row.accessToken?.trim());
}

/**
 * Prefer encrypted payload. Fallback to plaintext ONLY when encrypted is absent.
 * If encrypted is present and decrypt fails → fail-closed (never fall back to plaintext).
 */
export function resolveLineAccessToken(
  row: LineAccessTokenFields,
  keyring: TokenKeyring | null = getTokenEncryptionKeyring()
): ResolveLineAccessTokenResult {
  const encrypted = row.accessTokenEncrypted?.trim() || null;
  const legacy = row.accessToken?.trim() || null;

  if (encrypted) {
    try {
      const token = decryptSecret(encrypted, keyring);
      if (!token.trim()) {
        return { ok: false, code: "CREDENTIAL_DECRYPT_FAILED" };
      }
      return { ok: true, token, source: "encrypted" };
    } catch (e) {
      if (e instanceof TokenEncryptionError) {
        if (e.code === "ENCRYPTION_KEY_MISSING") {
          return { ok: false, code: "ENCRYPTION_KEY_MISSING" };
        }
        if (e.code === "UNSUPPORTED_CREDENTIAL_VERSION") {
          return { ok: false, code: "UNSUPPORTED_CREDENTIAL_VERSION" };
        }
        if (e.code === "INVALID_ENCRYPTED_CREDENTIAL") {
          return { ok: false, code: "INVALID_ENCRYPTED_CREDENTIAL" };
        }
        return { ok: false, code: "CREDENTIAL_DECRYPT_FAILED" };
      }
      return { ok: false, code: "CREDENTIAL_DECRYPT_FAILED" };
    }
  }

  if (legacy) {
    return { ok: true, token: legacy, source: "legacy_plaintext" };
  }

  return { ok: false, code: "CREDENTIAL_UNAVAILABLE" };
}

/**
 * Dual-write fields for a new/replaced Meta access token.
 * Requires encryption keyring — fails closed without writing plaintext-only.
 */
export function buildDualWriteAccessTokenFields(
  plaintext: string,
  keyring: TokenKeyring | null = getTokenEncryptionKeyring()
): { accessToken: string; accessTokenEncrypted: string } {
  const token = plaintext.trim();
  if (!token) {
    throw new TokenEncryptionError("CREDENTIAL_ENCRYPT_FAILED", "Access token is empty");
  }
  const accessTokenEncrypted = encryptSecret(token, keyring);
  if (!isEncryptedSecret(accessTokenEncrypted)) {
    throw new TokenEncryptionError("CREDENTIAL_ENCRYPT_FAILED", "Encrypt produced invalid payload");
  }
  return {
    accessToken: token,
    accessTokenEncrypted,
  };
}

export function lineAccessTokenErrorMessage(code: ResolveLineAccessTokenFailure["code"]): string {
  switch (code) {
    case "CREDENTIAL_UNAVAILABLE":
      return "Canal sem credencial de acesso configurada.";
    case "ENCRYPTION_KEY_MISSING":
      return "Chave de criptografia de tokens não configurada.";
    case "UNSUPPORTED_CREDENTIAL_VERSION":
      return "Formato de credencial criptografada não suportado.";
    case "INVALID_ENCRYPTED_CREDENTIAL":
    case "CREDENTIAL_DECRYPT_FAILED":
      return "Não foi possível utilizar a credencial armazenada.";
    default:
      return "Credencial indisponível.";
  }
}
