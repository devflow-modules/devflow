/**
 * AES-256-GCM encryption for WhatsApp Platform Meta access tokens at rest (SEC-1a).
 * Key material is injected via keyring — do not read process.env from Meta domain modules.
 */

import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from "node:crypto";

export const TOKEN_ENCRYPTION_ALG = "aes-256-gcm" as const;
export const TOKEN_ENCRYPTION_VERSION = 1 as const;
export const TOKEN_ENCRYPTION_KEY_BYTES = 32;
export const TOKEN_ENCRYPTION_NONCE_BYTES = 12;
export const TOKEN_ENCRYPTION_TAG_BYTES = 16;

/** Compact wire format: dfwa1.<keyId>.<nonce>.<ciphertext>.<tag> (base64url parts). */
export const ENCRYPTED_SECRET_PREFIX = "dfwa1" as const;

export type TokenEncryptionErrorCode =
  | "ENCRYPTION_KEY_MISSING"
  | "CREDENTIAL_ENCRYPT_FAILED"
  | "CREDENTIAL_DECRYPT_FAILED"
  | "UNSUPPORTED_CREDENTIAL_VERSION"
  | "INVALID_ENCRYPTED_CREDENTIAL";

export class TokenEncryptionError extends Error {
  readonly code: TokenEncryptionErrorCode;

  constructor(code: TokenEncryptionErrorCode, message: string) {
    super(message);
    this.name = "TokenEncryptionError";
    this.code = code;
  }
}

export type TokenKeyMaterial = {
  keyId: string;
  /** Exactly 32 raw bytes. */
  key: Buffer;
};

export type TokenKeyring = {
  current: TokenKeyMaterial;
  previous?: TokenKeyMaterial;
};

export type EncryptedSecretParts = {
  version: typeof TOKEN_ENCRYPTION_VERSION;
  keyId: string;
  algorithm: typeof TOKEN_ENCRYPTION_ALG;
  nonce: Buffer;
  ciphertext: Buffer;
  tag: Buffer;
};

function b64urlEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64");
}

function assertKeyMaterial(material: TokenKeyMaterial, label: string): void {
  if (!material.keyId?.trim()) {
    throw new TokenEncryptionError("ENCRYPTION_KEY_MISSING", `${label} keyId is empty`);
  }
  if (!Buffer.isBuffer(material.key) || material.key.length !== TOKEN_ENCRYPTION_KEY_BYTES) {
    throw new TokenEncryptionError(
      "ENCRYPTION_KEY_MISSING",
      `${label} key must be exactly ${TOKEN_ENCRYPTION_KEY_BYTES} bytes`
    );
  }
}

export function assertTokenKeyring(keyring: TokenKeyring | null | undefined): TokenKeyring {
  if (!keyring?.current) {
    throw new TokenEncryptionError("ENCRYPTION_KEY_MISSING", "Token encryption keyring is not configured");
  }
  assertKeyMaterial(keyring.current, "current");
  if (keyring.previous) {
    assertKeyMaterial(keyring.previous, "previous");
    if (keyring.previous.keyId === keyring.current.keyId) {
      throw new TokenEncryptionError(
        "ENCRYPTION_KEY_MISSING",
        "current and previous keyIds must differ"
      );
    }
  }
  return keyring;
}

/**
 * True when the string matches the versioned encrypted payload format (not legacy plaintext).
 */
export function isEncryptedSecret(payload: string | null | undefined): boolean {
  if (!payload || typeof payload !== "string") return false;
  const trimmed = payload.trim();
  if (!trimmed.startsWith(`${ENCRYPTED_SECRET_PREFIX}.`)) return false;
  const parts = trimmed.split(".");
  return parts.length === 5 && parts[0] === ENCRYPTED_SECRET_PREFIX && parts[1].length > 0;
}

export function serializeEncryptedSecret(parts: EncryptedSecretParts): string {
  return [
    ENCRYPTED_SECRET_PREFIX,
    parts.keyId,
    b64urlEncode(parts.nonce),
    b64urlEncode(parts.ciphertext),
    b64urlEncode(parts.tag),
  ].join(".");
}

export function parseEncryptedSecret(payload: string): EncryptedSecretParts {
  const trimmed = payload.trim();
  if (!isEncryptedSecret(trimmed)) {
    throw new TokenEncryptionError("INVALID_ENCRYPTED_CREDENTIAL", "Encrypted credential format is invalid");
  }
  const [, keyId, nonceB64, ctB64, tagB64] = trimmed.split(".");
  let nonce: Buffer;
  let ciphertext: Buffer;
  let tag: Buffer;
  try {
    nonce = b64urlDecode(nonceB64);
    ciphertext = b64urlDecode(ctB64);
    tag = b64urlDecode(tagB64);
  } catch {
    throw new TokenEncryptionError("INVALID_ENCRYPTED_CREDENTIAL", "Encrypted credential encoding is invalid");
  }
  if (nonce.length !== TOKEN_ENCRYPTION_NONCE_BYTES) {
    throw new TokenEncryptionError("INVALID_ENCRYPTED_CREDENTIAL", "Encrypted credential nonce length is invalid");
  }
  if (tag.length !== TOKEN_ENCRYPTION_TAG_BYTES) {
    throw new TokenEncryptionError("INVALID_ENCRYPTED_CREDENTIAL", "Encrypted credential tag length is invalid");
  }
  if (ciphertext.length < 1) {
    throw new TokenEncryptionError("INVALID_ENCRYPTED_CREDENTIAL", "Encrypted credential ciphertext is empty");
  }
  return {
    version: TOKEN_ENCRYPTION_VERSION,
    keyId,
    algorithm: TOKEN_ENCRYPTION_ALG,
    nonce,
    ciphertext,
    tag,
  };
}

export function encryptSecret(plaintext: string, keyring: TokenKeyring | null | undefined): string {
  const ring = assertTokenKeyring(keyring);
  if (typeof plaintext !== "string" || !plaintext) {
    throw new TokenEncryptionError("CREDENTIAL_ENCRYPT_FAILED", "Plaintext credential is empty");
  }
  try {
    const nonce = randomBytes(TOKEN_ENCRYPTION_NONCE_BYTES);
    const cipher = createCipheriv(TOKEN_ENCRYPTION_ALG, ring.current.key, nonce);
    const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    if (tag.length !== TOKEN_ENCRYPTION_TAG_BYTES) {
      throw new TokenEncryptionError("CREDENTIAL_ENCRYPT_FAILED", "Unexpected authentication tag length");
    }
    return serializeEncryptedSecret({
      version: TOKEN_ENCRYPTION_VERSION,
      keyId: ring.current.keyId,
      algorithm: TOKEN_ENCRYPTION_ALG,
      nonce,
      ciphertext,
      tag,
    });
  } catch (e) {
    if (e instanceof TokenEncryptionError) throw e;
    throw new TokenEncryptionError("CREDENTIAL_ENCRYPT_FAILED", "Failed to encrypt credential");
  }
}

function resolveKeyForDecrypt(keyring: TokenKeyring, keyId: string): Buffer {
  if (keyring.current.keyId === keyId) return keyring.current.key;
  if (keyring.previous && keyring.previous.keyId === keyId) return keyring.previous.key;
  throw new TokenEncryptionError("CREDENTIAL_DECRYPT_FAILED", "Unknown encryption key id");
}

export function decryptSecret(payload: string, keyring: TokenKeyring | null | undefined): string {
  const ring = assertTokenKeyring(keyring);
  const parts = parseEncryptedSecret(payload);

  // Version is implied by prefix dfwa1; reject anything else if format evolves.
  if (parts.version !== TOKEN_ENCRYPTION_VERSION) {
    throw new TokenEncryptionError(
      "UNSUPPORTED_CREDENTIAL_VERSION",
      "Unsupported encrypted credential version"
    );
  }

  let key: Buffer;
  try {
    key = resolveKeyForDecrypt(ring, parts.keyId);
  } catch (e) {
    if (e instanceof TokenEncryptionError) throw e;
    throw new TokenEncryptionError("CREDENTIAL_DECRYPT_FAILED", "Failed to resolve encryption key");
  }

  try {
    const decipher = createDecipheriv(TOKEN_ENCRYPTION_ALG, key, parts.nonce);
    decipher.setAuthTag(parts.tag);
    const plain = Buffer.concat([decipher.update(parts.ciphertext), decipher.final()]);
    return plain.toString("utf8");
  } catch {
    throw new TokenEncryptionError("CREDENTIAL_DECRYPT_FAILED", "Failed to decrypt credential");
  }
}

/** Test helper: mutate a single byte in the ciphertext segment (fails auth). */
export function tamperEncryptedCiphertextForTest(payload: string): string {
  const parts = parseEncryptedSecret(payload);
  const ct = Buffer.from(parts.ciphertext);
  ct[0] = (ct[0] + 1) % 256;
  return serializeEncryptedSecret({ ...parts, ciphertext: ct });
}

/** Test helper: mutate auth tag. */
export function tamperEncryptedTagForTest(payload: string): string {
  const parts = parseEncryptedSecret(payload);
  const tag = Buffer.from(parts.tag);
  tag[0] = (tag[0] + 1) % 256;
  // Ensure we actually changed something even if wrap
  if (timingSafeEqual(tag, parts.tag)) tag[1] = (tag[1] + 1) % 256;
  return serializeEncryptedSecret({ ...parts, tag });
}
