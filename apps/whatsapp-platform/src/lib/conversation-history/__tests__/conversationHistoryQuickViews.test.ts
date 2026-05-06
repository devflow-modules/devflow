import { describe, it, expect } from "vitest";
import {
  CONVERSATION_HISTORY_QUICK_VIEWS,
  matchesConversationHistoryQuickView,
} from "../conversationHistoryQuickViews";
import type { ConversationHistoryUrlState } from "../conversationHistoryUrlState";

function state(over: Partial<ConversationHistoryUrlState> = {}): ConversationHistoryUrlState {
  return {
    phase: "closed",
    preset: "all",
    customFrom: "",
    customTo: "",
    search: "",
    businessPhoneNumberId: null,
    ...over,
  };
}

describe("matchesConversationHistoryQuickView", () => {
  const encerradas = CONVERSATION_HISTORY_QUICK_VIEWS.find((v) => v.id === "encerradas-recentes")!;
  const todas7 = CONVERSATION_HISTORY_QUICK_VIEWS.find((v) => v.id === "todas-7d")!;
  const todas = CONVERSATION_HISTORY_QUICK_VIEWS.find((v) => v.id === "todas")!;

  it("reconhece encerradas + todo o período (URL limpa)", () => {
    expect(matchesConversationHistoryQuickView(state(), encerradas)).toBe(true);
    expect(matchesConversationHistoryQuickView(state({ businessPhoneNumberId: "pn-1" }), encerradas)).toBe(true);
  });

  it("reconhece todas — 7 dias", () => {
    expect(matchesConversationHistoryQuickView(state({ phase: "all", preset: "7d" }), todas7)).toBe(true);
  });

  it("reconhece Todas (phase all + preset all)", () => {
    expect(matchesConversationHistoryQuickView(state({ phase: "all", preset: "all" }), todas)).toBe(true);
  });

  it("não coincide com busca activa", () => {
    expect(matchesConversationHistoryQuickView(state({ search: "x" }), encerradas)).toBe(false);
  });

  it("não coincide com período personalizado", () => {
    expect(
      matchesConversationHistoryQuickView(
        state({ preset: "custom", customFrom: "2026-01-01", customTo: "2026-01-02" }),
        encerradas
      )
    ).toBe(false);
  });

  it("distingue todas vs todas 7 dias", () => {
    expect(matchesConversationHistoryQuickView(state({ phase: "all", preset: "all" }), todas7)).toBe(false);
    expect(matchesConversationHistoryQuickView(state({ phase: "all", preset: "7d" }), todas)).toBe(false);
  });
});
