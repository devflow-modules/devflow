import { describe, it, expect } from "vitest";
import {
  buildRecentMessagesSummary,
  getPlaybookInstruction,
  resolveNextState,
} from "../conversationStateService";

describe("resolveNextState", () => {
  it("primeira mensagem → lead", () => {
    expect(
      resolveNextState({ previousState: null, inboundTextCount: 1, lastInboundText: "oi" })
    ).toBe("lead");
  });

  it("segunda mensagem → qualifying", () => {
    expect(
      resolveNextState({ previousState: "lead", inboundTextCount: 2, lastInboundText: "sim" })
    ).toBe("qualifying");
  });

  it("qualifying + interesse → negotiating", () => {
    expect(
      resolveNextState({
        previousState: "qualifying",
        inboundTextCount: 3,
        lastInboundText: "qual o preço do plano?",
      })
    ).toBe("negotiating");
  });

  it("qualquer estágio com problema → support", () => {
    expect(
      resolveNextState({
        previousState: "negotiating",
        inboundTextCount: 5,
        lastInboundText: "deu erro no pagamento",
      })
    ).toBe("support");
  });

  it("negotiating + fecho → closed", () => {
    expect(
      resolveNextState({
        previousState: "negotiating",
        inboundTextCount: 6,
        lastInboundText: "combinado, pode fechar",
      })
    ).toBe("closed");
  });

  it("mantém closed", () => {
    expect(
      resolveNextState({ previousState: "closed", inboundTextCount: 2, lastInboundText: "oi" })
    ).toBe("closed");
  });
});

describe("getPlaybookInstruction", () => {
  it("inclui objetivo por estágio", () => {
    expect(getPlaybookInstruction("lead")).toContain("interesse");
    expect(getPlaybookInstruction("negotiating")).toContain("fechar");
  });
});

describe("buildRecentMessagesSummary", () => {
  it("resume últimas mensagens", () => {
    const s = buildRecentMessagesSummary(
      [
        { role: "user", content: "olá" },
        { role: "assistant", content: "oi" },
        { role: "user", content: "quanto custa?" },
      ],
      3
    );
    expect(s).toContain("Cliente: olá");
    expect(s).toContain("Assistente: oi");
    expect(s).toContain("Cliente: quanto custa?");
  });
});
