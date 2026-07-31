import { describe, expect, it } from "vitest";
import {
  TOKEN_ENCRYPTION_KEY_BYTES,
  encryptSecret,
  tamperEncryptedCiphertextForTest,
  type TokenKeyring,
} from "@/lib/secrets/tokenEncryption";
import {
  buildDualWriteAccessTokenFields,
  hasStoredLineAccessToken,
  resolveLineAccessToken,
} from "../lineAccessToken";

function ring(): TokenKeyring {
  return { current: { keyId: "test-k1", key: Buffer.alloc(TOKEN_ENCRYPTION_KEY_BYTES, 5) } };
}

describe("lineAccessToken dual-read", () => {
  it("somente plaintext funciona", () => {
    const r = resolveLineAccessToken(
      { accessToken: "legacy-tok", accessTokenEncrypted: null },
      null
    );
    expect(r).toEqual({ ok: true, token: "legacy-tok", source: "legacy_plaintext" });
  });

  it("somente encrypted funciona", () => {
    const keyring = ring();
    const enc = encryptSecret("enc-only", keyring);
    const r = resolveLineAccessToken(
      { accessToken: null, accessTokenEncrypted: enc },
      keyring
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.token).toBe("enc-only");
      expect(r.source).toBe("encrypted");
    }
  });

  it("ambos presentes preferem encrypted", () => {
    const keyring = ring();
    const enc = encryptSecret("from-enc", keyring);
    const r = resolveLineAccessToken(
      { accessToken: "from-plain", accessTokenEncrypted: enc },
      keyring
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.token).toBe("from-enc");
      expect(r.source).toBe("encrypted");
    }
  });

  it("encrypted corrompido com plaintext presente falha fechado", () => {
    const keyring = ring();
    const enc = tamperEncryptedCiphertextForTest(encryptSecret("good", keyring));
    const r = resolveLineAccessToken(
      { accessToken: "legacy-still-there", accessTokenEncrypted: enc },
      keyring
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("CREDENTIAL_DECRYPT_FAILED");
  });

  it("keyId desconhecido falha fechado (não usa plaintext)", () => {
    const keyring = ring();
    const enc = encryptSecret("secret-token", keyring);
    const otherRing = {
      current: { keyId: "other-id", key: Buffer.alloc(TOKEN_ENCRYPTION_KEY_BYTES, 9) },
    };
    const r = resolveLineAccessToken(
      { accessToken: "legacy-must-not-win", accessTokenEncrypted: enc },
      otherRing
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("CREDENTIAL_DECRYPT_FAILED");
  });

  it("ambos ausentes → CREDENTIAL_UNAVAILABLE", () => {
    const r = resolveLineAccessToken({ accessToken: null, accessTokenEncrypted: null }, ring());
    expect(r).toEqual({ ok: false, code: "CREDENTIAL_UNAVAILABLE" });
  });

  it("hasStoredLineAccessToken sem descriptografar", () => {
    expect(
      hasStoredLineAccessToken({ accessToken: null, accessTokenEncrypted: "dfwa1.k.a.b.c" })
    ).toBe(true);
    expect(hasStoredLineAccessToken({ accessToken: "x", accessTokenEncrypted: null })).toBe(true);
    expect(hasStoredLineAccessToken({ accessToken: null, accessTokenEncrypted: null })).toBe(false);
  });
});

describe("lineAccessToken dual-write", () => {
  it("grava plaintext + encrypted", () => {
    const fields = buildDualWriteAccessTokenFields("dual-token", ring());
    expect(fields.accessToken).toBe("dual-token");
    expect(fields.accessTokenEncrypted.startsWith("dfwa1.")).toBe(true);
    const read = resolveLineAccessToken(
      {
        accessToken: fields.accessToken,
        accessTokenEncrypted: fields.accessTokenEncrypted,
      },
      ring()
    );
    expect(read.ok && read.token).toBe("dual-token");
  });

  it("falha criptográfica sem keyring", () => {
    expect(() => buildDualWriteAccessTokenFields("tok", null)).toThrow();
  });
});
