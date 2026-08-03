import { describe, expect, it } from "vitest";
import {
  TOKEN_ENCRYPTION_KEY_BYTES,
  encryptSecret,
  tamperEncryptedCiphertextForTest,
  type TokenKeyring,
} from "@/lib/secrets/tokenEncryption";
import {
  buildEncryptedAccessTokenFields,
  hasStoredLineAccessToken,
  resolveLineAccessToken,
} from "../lineAccessToken";

function ring(): TokenKeyring {
  return { current: { keyId: "test-k1", key: Buffer.alloc(TOKEN_ENCRYPTION_KEY_BYTES, 5) } };
}

describe("lineAccessToken encrypt-only read", () => {
  it("somente encrypted funciona", () => {
    const keyring = ring();
    const enc = encryptSecret("enc-only", keyring);
    const r = resolveLineAccessToken({ accessTokenEncrypted: enc }, keyring);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.token).toBe("enc-only");
      expect(r.source).toBe("encrypted");
    }
  });

  it("sem encrypted → CREDENTIAL_UNAVAILABLE", () => {
    const r = resolveLineAccessToken({ accessTokenEncrypted: null }, ring());
    expect(r).toEqual({ ok: false, code: "CREDENTIAL_UNAVAILABLE" });
  });

  it("encrypted corrompido falha fechado", () => {
    const keyring = ring();
    const enc = tamperEncryptedCiphertextForTest(encryptSecret("good", keyring));
    const r = resolveLineAccessToken({ accessTokenEncrypted: enc }, keyring);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("CREDENTIAL_DECRYPT_FAILED");
  });

  it("keyId desconhecido falha fechado", () => {
    const keyring = ring();
    const enc = encryptSecret("secret-token", keyring);
    const otherRing = {
      current: { keyId: "other-id", key: Buffer.alloc(TOKEN_ENCRYPTION_KEY_BYTES, 9) },
    };
    const r = resolveLineAccessToken({ accessTokenEncrypted: enc }, otherRing);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("CREDENTIAL_DECRYPT_FAILED");
  });

  it("sem keyring falha fechado", () => {
    const keyring = ring();
    const enc = encryptSecret("secret-token", keyring);
    const r = resolveLineAccessToken({ accessTokenEncrypted: enc }, null);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("ENCRYPTION_KEY_MISSING");
  });

  it("hasStoredLineAccessToken baseado só no encrypted", () => {
    expect(
      hasStoredLineAccessToken({ accessTokenEncrypted: "dfwa1.k.a.b.c" })
    ).toBe(true);
    expect(hasStoredLineAccessToken({ accessTokenEncrypted: null })).toBe(false);
    expect(hasStoredLineAccessToken({ accessTokenEncrypted: "  " })).toBe(false);
  });
});

describe("lineAccessToken encrypt-only write", () => {
  it("grava apenas accessTokenEncrypted", () => {
    const fields = buildEncryptedAccessTokenFields("enc-token", ring());
    expect(fields).toEqual({
      accessTokenEncrypted: expect.stringMatching(/^dfwa1\./),
    });
    expect(Object.keys(fields)).toEqual(["accessTokenEncrypted"]);
    const read = resolveLineAccessToken(fields, ring());
    expect(read.ok && read.token).toBe("enc-token");
  });

  it("falha criptográfica sem keyring", () => {
    expect(() => buildEncryptedAccessTokenFields("tok", null)).toThrow();
  });
});
