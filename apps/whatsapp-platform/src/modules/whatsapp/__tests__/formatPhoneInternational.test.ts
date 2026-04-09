import { describe, expect, it } from "vitest";
import { formatPhoneInternational, formatWhatsappLineStatusForUi } from "../formatPhoneInternational";

describe("formatPhoneInternational", () => {
  it("formata BR móvel 13 dígitos", () => {
    expect(formatPhoneInternational("5511999998888")).toBe("+55 11 99999-8888");
  });

  it("aceita entrada com símbolos", () => {
    expect(formatPhoneInternational("+55 (11) 99999-8888")).toBe("+55 11 99999-8888");
  });

  it("fallback + e dígitos para outros países", () => {
    expect(formatPhoneInternational("447911123456")).toBe("+447911123456");
  });
});

describe("formatWhatsappLineStatusForUi", () => {
  it("ACTIVE mostra ativo", () => {
    expect(formatWhatsappLineStatusForUi("ACTIVE")).toBe("Status: ativo ✓");
  });
  it("PENDING mostra aviso", () => {
    expect(formatWhatsappLineStatusForUi("PENDING")).toBe("Status: não conectado ⚠");
  });
});
