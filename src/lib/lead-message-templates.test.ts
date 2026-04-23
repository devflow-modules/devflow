import { describe, it, expect } from "vitest";
import { getTemplateByAction, buildWhatsAppUrlWithMessage } from "./lead-message-templates";

describe("lead-message-templates", () => {
  it("getTemplateByAction mapeia tipos conhecidos", () => {
    const lead = { name: "Ana", company: "X" };
    expect(getTemplateByAction("first_contact", lead).length).toBeGreaterThan(10);
    expect(getTemplateByAction("qualify", lead)).toContain("Ana");
    expect(getTemplateByAction("close", lead)).toBe("");
    expect(getTemplateByAction("none", lead)).toBe("");
  });

  it("buildWhatsAppUrlWithMessage aplica um único encode (text=)", () => {
    const url = buildWhatsAppUrlWithMessage("5511999990000", "olá & teste? x=y");
    expect(url).toContain(encodeURIComponent("olá & teste? x=y"));
    expect(url).toMatch(/^https:\/\/wa\.me\//);
  });
});
