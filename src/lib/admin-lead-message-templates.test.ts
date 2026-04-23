import { describe, it, expect } from "vitest";
import {
  firstContactTemplate,
  followUpTemplate,
  sendDemoTemplate,
  buildWaMeUrlWithText,
  buildWhatsAppUrlWithMessage,
} from "./admin-lead-message-templates";

describe("admin-lead-message-templates", () => {
  const lead = { name: "Ana", company: "Loja X" };

  it("firstContactTemplate retorna string com nome e empresa", () => {
    const t = firstContactTemplate(lead);
    expect(typeof t).toBe("string");
    expect(t.length).toBeGreaterThan(10);
    expect(t).toContain("Ana");
    expect(t).toContain("Loja X");
  });

  it("followUpTemplate e sendDemoTemplate retornam string", () => {
    expect(followUpTemplate(lead).length).toBeGreaterThan(20);
    expect(sendDemoTemplate(lead).length).toBeGreaterThan(20);
  });

  it("aceita name/company null", () => {
    const plain = firstContactTemplate({});
    expect(typeof plain).toBe("string");
    expect(plain).toContain("DevFlow");
  });

  it("wa.me com text encodado (legado buildWaMeUrlWithText)", () => {
    const url = buildWaMeUrlWithText("5511999990000", encodeURIComponent("olá teste"));
    expect(url).toContain("wa.me/5511999990000");
    expect(url).toContain("text=");
  });

  it("buildWhatsAppUrlWithMessage codifica a mensagem", () => {
    const url = buildWhatsAppUrlWithMessage("+55 11 9 9999-0000", "olá\nlinha");
    expect(url).toMatch(/^https:\/\/wa\.me\/5511999990000\?text=/);
    expect(url).toContain(encodeURIComponent("olá\nlinha"));
  });
});
