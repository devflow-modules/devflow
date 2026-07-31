import { describe, expect, it } from "vitest";
import {
  TOKEN_ENCRYPTION_KEY_BYTES,
  TokenEncryptionError,
  decryptSecret,
  encryptSecret,
  isEncryptedSecret,
  tamperEncryptedCiphertextForTest,
  tamperEncryptedTagForTest,
  type TokenKeyring,
} from "../tokenEncryption";

function makeKey(fill: number): Buffer {
  return Buffer.alloc(TOKEN_ENCRYPTION_KEY_BYTES, fill);
}

function makeKeyring(overrides?: Partial<TokenKeyring>): TokenKeyring {
  return {
    current: { keyId: "k1", key: makeKey(7) },
    ...overrides,
  };
}

describe("tokenEncryption", () => {
  it("encrypt/decrypt round trip", () => {
    const ring = makeKeyring();
    const payload = encryptSecret("EAAG_TEST_TOKEN_VALUE", ring);
    expect(isEncryptedSecret(payload)).toBe(true);
    expect(payload).not.toContain("EAAG_TEST_TOKEN_VALUE");
    expect(decryptSecret(payload, ring)).toBe("EAAG_TEST_TOKEN_VALUE");
  });

  it("mesmo plaintext gera ciphertext diferente (nonce único)", () => {
    const ring = makeKeyring();
    const a = encryptSecret("same-token", ring);
    const b = encryptSecret("same-token", ring);
    expect(a).not.toBe(b);
    expect(decryptSecret(a, ring)).toBe("same-token");
    expect(decryptSecret(b, ring)).toBe("same-token");
  });

  it("payload não contém plaintext", () => {
    const ring = makeKeyring();
    const plain = "super-secret-meta-token-xyz";
    const payload = encryptSecret(plain, ring);
    expect(payload.includes(plain)).toBe(false);
    expect(JSON.stringify(payload).includes(plain)).toBe(false);
  });

  it("alteração no ciphertext falha", () => {
    const ring = makeKeyring();
    const payload = tamperEncryptedCiphertextForTest(encryptSecret("tok", ring));
    expect(() => decryptSecret(payload, ring)).toThrow(TokenEncryptionError);
    try {
      decryptSecret(payload, ring);
    } catch (e) {
      expect(e).toBeInstanceOf(TokenEncryptionError);
      expect((e as TokenEncryptionError).code).toBe("CREDENTIAL_DECRYPT_FAILED");
      expect((e as Error).message).not.toContain("tok");
      expect((e as Error).message).not.toMatch(/dfwa1\./);
    }
  });

  it("alteração na tag falha", () => {
    const ring = makeKeyring();
    const payload = tamperEncryptedTagForTest(encryptSecret("tok", ring));
    expect(() => decryptSecret(payload, ring)).toThrow(TokenEncryptionError);
  });

  it("chave errada falha", () => {
    const ring = makeKeyring();
    const payload = encryptSecret("tok", ring);
    const wrong = makeKeyring({ current: { keyId: "k1", key: makeKey(9) } });
    expect(() => decryptSecret(payload, wrong)).toThrow(TokenEncryptionError);
  });

  it("chave ausente falha", () => {
    expect(() => encryptSecret("tok", null)).toThrow(TokenEncryptionError);
    expect(() => decryptSecret("dfwa1.k1.a.b.c", null)).toThrow(TokenEncryptionError);
  });

  it("chave com tamanho inválido falha", () => {
    expect(() =>
      encryptSecret("tok", { current: { keyId: "k1", key: Buffer.alloc(16) } })
    ).toThrow(TokenEncryptionError);
  });

  it("payload inválido falha", () => {
    const ring = makeKeyring();
    expect(() => decryptSecret("not-encrypted", ring)).toThrow(TokenEncryptionError);
    expect(() => decryptSecret("dfwa1.only.two", ring)).toThrow(TokenEncryptionError);
  });

  it("keyId desconhecido falha", () => {
    const ring = makeKeyring();
    const payload = encryptSecret("tok", ring);
    const other = makeKeyring({ current: { keyId: "other", key: makeKey(7) } });
    expect(() => decryptSecret(payload, other)).toThrow(TokenEncryptionError);
  });

  it("erros não contêm segredo", () => {
    const ring = makeKeyring();
    const secret = "PLAINTEXT_SECRET_MUST_NOT_LEAK";
    try {
      decryptSecret(tamperEncryptedCiphertextForTest(encryptSecret(secret, ring)), ring);
      expect.unreachable();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      expect(msg).not.toContain(secret);
      expect(msg).not.toContain(ring.current.key.toString("base64"));
    }
  });

  it("rotação current/previous", () => {
    const previousKey = makeKey(3);
    const currentKey = makeKey(7);
    const previousRing: TokenKeyring = { current: { keyId: "k0", key: previousKey } };
    const payload = encryptSecret("rotated-token", previousRing);
    const rotated: TokenKeyring = {
      current: { keyId: "k1", key: currentKey },
      previous: { keyId: "k0", key: previousKey },
    };
    expect(decryptSecret(payload, rotated)).toBe("rotated-token");
    const fresh = encryptSecret("new-token", rotated);
    expect(decryptSecret(fresh, rotated)).toBe("new-token");
  });

  it("isEncryptedSecret distingue legado", () => {
    expect(isEncryptedSecret("EAAG_plain")).toBe(false);
    expect(isEncryptedSecret(null)).toBe(false);
    const payload = encryptSecret("x", makeKeyring());
    expect(isEncryptedSecret(payload)).toBe(true);
  });
});
