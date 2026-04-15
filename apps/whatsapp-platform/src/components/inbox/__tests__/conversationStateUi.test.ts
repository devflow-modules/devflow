import { describe, it, expect } from "vitest";
import {
  conversationStateOperationalHint,
  conversationStateSuggestedActions,
  getConversationStateBadge,
} from "../conversationStateUi";

describe("conversationStateUi", () => {
  it("badges mapeiam estados conhecidos", () => {
    expect(getConversationStateBadge("awaiting_agent")?.label).toBe("Precisa resposta");
    expect(getConversationStateBadge("in_progress")?.label).toBe("Em atendimento");
    expect(getConversationStateBadge("awaiting_customer")?.label).toBe("Aguardando cliente");
    expect(getConversationStateBadge("closed")?.label).toBe("Encerrada");
  });

  it("hint operacional por estado", () => {
    expect(conversationStateOperationalHint("awaiting_agent")).toContain("Prioridade");
    expect(conversationStateOperationalHint("closed")).toContain("encerrada");
  });

  it("sugestões do painel não estão vazias para estados principais", () => {
    expect(conversationStateSuggestedActions("awaiting_agent").length).toBeGreaterThan(0);
    expect(conversationStateSuggestedActions("in_progress").length).toBeGreaterThan(0);
    expect(conversationStateSuggestedActions("awaiting_customer").length).toBeGreaterThan(0);
    expect(conversationStateSuggestedActions("closed").length).toBeGreaterThan(0);
  });

  it("estado indefinido não quebra", () => {
    expect(getConversationStateBadge(undefined)).toBeNull();
    expect(conversationStateOperationalHint(undefined)).toBeNull();
    expect(conversationStateSuggestedActions(undefined)).toEqual([]);
  });
});
