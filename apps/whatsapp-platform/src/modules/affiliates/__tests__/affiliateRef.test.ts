import { describe, it, expect } from "vitest";
import { isValidAffiliateRefId, resolveSignupAffiliateRef } from "../affiliateRef";

/** CUID válido para testes (formato aceite pelo Zod). */
const VALID_AFF = "cjld2cjxh0000qzrmn831ir4";
const VALID_B = "ckfqz8q3q0000q3q3q3q3q3q3";

describe("isValidAffiliateRefId", () => {
  it("aceita cuid válido", () => {
    expect(isValidAffiliateRefId(VALID_AFF)).toBe(true);
  });

  it("rejeita lixo", () => {
    expect(isValidAffiliateRefId("")).toBe(false);
    expect(isValidAffiliateRefId("not-a-cuid")).toBe(false);
    expect(isValidAffiliateRefId("123")).toBe(false);
  });
});

describe("resolveSignupAffiliateRef", () => {
  it("prioriza corpo válido sobre cookie", () => {
    expect(resolveSignupAffiliateRef(VALID_AFF, VALID_B)).toEqual({ id: VALID_AFF, via: "body" });
  });

  it("usa cookie se corpo ausente", () => {
    expect(resolveSignupAffiliateRef(undefined, VALID_AFF)).toEqual({ id: VALID_AFF, via: "cookie" });
  });

  it("usa cookie se corpo inválido", () => {
    expect(resolveSignupAffiliateRef("nope", VALID_AFF)).toEqual({ id: VALID_AFF, via: "cookie" });
  });

  it("sem ref válido devolve null", () => {
    expect(resolveSignupAffiliateRef(undefined, undefined)).toEqual({ id: null, via: null });
    expect(resolveSignupAffiliateRef("bad", "bad")).toEqual({ id: null, via: null });
  });
});
