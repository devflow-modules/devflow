import { describe, expect, it } from "vitest";
import { buildWhatsAppLink, normalizePhoneDigitsForWaMe } from "../buildWhatsAppLink";

describe("buildWhatsAppLink", () => {
  it("remove espaços e traços e gera wa.me", () => {
    expect(buildWhatsAppLink({ phoneNumber: "+55 11 99999-8888" })).toBe("https://wa.me/5511999998888");
  });

  it("inclui text= com encode", () => {
    const u = buildWhatsAppLink({
      phoneNumber: "351912345678",
      message: "Olá! Teste ?",
    });
    expect(u).toBe(`https://wa.me/351912345678?text=${encodeURIComponent("Olá! Teste ?")}`);
  });

  it("normalizePhoneDigitsForWaMe só dígitos", () => {
    expect(normalizePhoneDigitsForWaMe("(11) 98765-4321")).toBe("11987654321");
  });
});
