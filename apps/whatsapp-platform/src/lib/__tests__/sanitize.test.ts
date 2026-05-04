import { describe, expect, it } from "vitest";
import { maskDocumentLike, maskPhoneLike, sanitizeLogData } from "../observability/sanitize";

describe("maskPhoneLike", () => {
  it("telefone curto (< 6 dígitos) retorna ***", () => {
    expect(maskPhoneLike("12345")).toBe("***");
    expect(maskPhoneLike("+55")).toBe("***");
    expect(maskPhoneLike("")).toBe("***");
  });

  it("telefone com 6 a 10 dígitos preserva 3 prefixo e 2 sufixo", () => {
    expect(maskPhoneLike("551199")).toBe("551***99");
    expect(maskPhoneLike("+5511999888")).toBe("551***88");
  });

  it("telefone longo (> 10 dígitos) preserva 4 prefixo e 3 sufixo", () => {
    expect(maskPhoneLike("+55 11 90000-1234")).toBe("5511***234");
  });
});

describe("maskDocumentLike", () => {
  it("sequência curta (< 8 dígitos) retorna ***", () => {
    expect(maskDocumentLike("1234567")).toBe("***");
    expect(maskDocumentLike("")).toBe("***");
  });

  it("documento longo preserva 3 prefixo e 2 sufixo", () => {
    expect(maskDocumentLike("12.345.678/0001-90")).toBe("123***90");
  });
});

describe("sanitizeLogData", () => {
  it("omite chaves que contêm token, password, cookie, secret, authorization, hash", () => {
    const out = sanitizeLogData({
      access_token: "fake-token-value",
      userPassword: "fake-secret",
      Set_Cookie: "session=fake",
      apiSecretKey: "x",
      Authorization: "Bearer fake",
      payload_hash: "abc123",
      safeField: "visible",
    });
    expect(out).toEqual({ safeField: "visible" });
  });

  it("mascara strings em chaves de telefone e em from/to", () => {
    expect(
      sanitizeLogData({
        contact_phone: "+55 11 90000-1234",
        wa_from: "11900001234",
        to: "11900005678",
        label: "ok",
      })
    ).toEqual({
      contact_phone: "5511***234",
      wa_from: "1190***234",
      to: "1190***678",
      label: "ok",
    });
  });

  it("mascara strings em chaves de documento", () => {
    expect(
      sanitizeLogData({
        customer_cpf: "999.888.777-66",
        companyCNPJ: "00.000.000/0001-91",
      })
    ).toEqual({
      customer_cpf: "999***66",
      companyCNPJ: "000***91",
    });
  });

  it("string só numérica com 11 dígitos (sem chave sensível) trata como documento", () => {
    expect(
      sanitizeLogData({
        note: "99988877766",
      })
    ).toEqual({
      note: "999***66",
    });
  });

  it("sanitiza objetos aninhados e arrays de objetos", () => {
    expect(
      sanitizeLogData({
        meta: {
          nested_phone: "11900009999",
          inner: { password: "never" },
        },
        items: [{ msisdn: "11888887777" }, "plain"],
      })
    ).toEqual({
      meta: {
        nested_phone: "1190***999",
        inner: {},
      },
      items: [{ msisdn: "1188***777" }, "plain"],
    });
  });

  it("não mascara string de 11 dígitos se contiver letras nos dígitos extraídos", () => {
    expect(
      sanitizeLogData({
        ref: "9998887776a",
      })
    ).toEqual({
      ref: "9998887776a",
    });
  });
});
