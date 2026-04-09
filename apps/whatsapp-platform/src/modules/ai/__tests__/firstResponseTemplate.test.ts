import { describe, expect, it } from "vitest";
import {
  buildFirstAutomaticReply,
  objectivePhraseFromBusinessType,
  pickGreeting,
} from "../firstResponseTemplate";

describe("firstResponseTemplate", () => {
  it("pickGreeting é estável por tenantId", () => {
    expect(pickGreeting("t1")).toBe(pickGreeting("t1"));
    expect(["Olá!", "Oi!", "Olá 👋"]).toContain(pickGreeting("tenant-xyz"));
  });

  it("objectivePhraseFromBusinessType reconhece padrões", () => {
    expect(objectivePhraseFromBusinessType("restaurante")).toContain("pedidos");
    expect(objectivePhraseFromBusinessType("clinica")).toContain("agendamentos");
    expect(objectivePhraseFromBusinessType(null)).toBe("o seu atendimento");
  });

  it("buildFirstAutomaticReply inclui nome e pergunta", () => {
    const t = buildFirstAutomaticReply({
      tenantId: "tid",
      businessName: "Padaria Central",
      businessType: "other",
    });
    expect(t).toContain("Padaria Central");
    expect(t).toContain("Como posso ajudar hoje?");
    expect(t.toLowerCase()).toContain("assistente");
  });

  it("fallback de nome quando vazio", () => {
    const t = buildFirstAutomaticReply({
      tenantId: "x",
      businessName: null,
      businessType: null,
    });
    expect(t).toContain("a nossa equipa");
  });
});
