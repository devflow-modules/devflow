/**
 * Encrypt-only helpers for WhatsAppPhoneNumber Meta access tokens (SEC-1-final).
 *
 * Tokens at rest exist only as AES-256-GCM payloads in `accessTokenEncrypted`.
 * There is no plaintext column and no legacy fallback.
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
  accessTokenEncrypted: string | null;
};

export type LineAccessTokenSource = "encrypted";

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
  return Boolean(row.accessTokenEncrypted?.trim());
}

/**
 * Decrypt stored credential. Missing encrypted → unavailable.
 * Decrypt failure → fail-closed (no plaintext fallback).
 */
export function resolveLineAccessToken(
  row: LineAccessTokenFields,
  keyring: TokenKeyring | null = getTokenEncryptionKeyring()
): ResolveLineAccessTokenResult {
  const encrypted = row.accessTokenEncrypted?.trim() || null;

  if (!encrypted) {
    return { ok: false, code: "CREDENTIAL_UNAVAILABLE" };
  }

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

/**
 * Persist fields for a new/replaced Meta access token (encrypt-only).
 * Requires encryption keyring — fails closed without writing plaintext.
 */
export function buildEncryptedAccessTokenFields(
  plaintext: string,
  keyring: TokenKeyring | null = getTokenEncryptionKeyring()
): { accessTokenEncrypted: string } {
  const token = plaintext.trim();
  if (!token) {
    throw new TokenEncryptionError("CREDENTIAL_ENCRYPT_FAILED", "Access token is empty");
  }
  const accessTokenEncrypted = encryptSecret(token, keyring);
  if (!isEncryptedSecret(accessTokenEncrypted)) {
    throw new TokenEncryptionError("CREDENTIAL_ENCRYPT_FAILED", "Encrypt produced invalid payload");
  }
  return { accessTokenEncrypted };
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
