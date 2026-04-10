import { describe, it, expect } from "vitest";
import { WaInboxThreadPriority } from "@/generated/prisma-whatsapp";
import {
  computeLeadScore,
  extractLeadData,
  getConversationPriority,
  mergeLeadData,
} from "../leadCrm";

describe("computeLeadScore", () => {
  it("soma +10 quando há mais de 2 mensagens de texto inbound", () => {
    expect(
      computeLeadScore({
        inboundTextCount: 3,
        lastMessageText: "ok",
        projectedAiState: "lead",
      })
    ).toBe(10);
  });

  it("soma +20 quando menciona preço/orçamento", () => {
    expect(
      computeLeadScore({
        inboundTextCount: 1,
        lastMessageText: "quanto custa o plano?",
        projectedAiState: "lead",
      })
    ).toBe(20);
  });

  it("soma +30 quando há urgência", () => {
    expect(
      computeLeadScore({
        inboundTextCount: 1,
        lastMessageText: "preciso hoje mesmo",
        projectedAiState: "lead",
      })
    ).toBe(30);
  });

  it("soma +15 em negotiating e -10 em support", () => {
    expect(
      computeLeadScore({
        inboundTextCount: 1,
        lastMessageText: "oi",
        projectedAiState: "negotiating",
      })
    ).toBe(15);

    expect(
      computeLeadScore({
        inboundTextCount: 1,
        lastMessageText: "oi",
        projectedAiState: "support",
      })
    ).toBe(-10);
  });
});

describe("extractLeadData", () => {
  it("extrai nome", () => {
    expect(extractLeadData("me chamo João Silva")).toMatchObject({ name: "João Silva" });
  });

  it("marca interesse e orçamento em quanto custa", () => {
    const r = extractLeadData("Oi, quanto custa o serviço?");
    expect(r.interest).toMatch(/preço|orçamento/i);
    expect(r.budget).toBeDefined();
  });

  it("extrai urgência", () => {
    expect(extractLeadData("preciso hoje à tarde")).toMatchObject({ urgency: "hoje" });
  });
});

describe("mergeLeadData", () => {
  it("não apaga campos já preenchidos", () => {
    const m = mergeLeadData({ name: "Ana" }, { name: "Outro", interest: "produto X" });
    expect(m.name).toBe("Ana");
    expect(m.interest).toBe("produto X");
  });
});

describe("getConversationPriority", () => {
  it("mapeia faixas de score para prioridade", () => {
    expect(getConversationPriority(60)).toBe(WaInboxThreadPriority.HIGH);
    expect(getConversationPriority(35)).toBe(WaInboxThreadPriority.MEDIUM);
    expect(getConversationPriority(10)).toBe(WaInboxThreadPriority.LOW);
  });
});
