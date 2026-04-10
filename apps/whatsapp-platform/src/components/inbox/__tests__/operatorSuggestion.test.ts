import { describe, it, expect } from "vitest";
import { generateOperatorSuggestion } from "../operatorSuggestion";
import type { WaInboxThreadRow } from "../inboxTypes";

function thinThread(aiState: string | null): WaInboxThreadRow {
  const now = new Date().toISOString();
  return {
    id: "t",
    phoneNumber: "1",
    businessPhoneNumberId: "p",
    contactName: null,
    lastMessageAt: now,
    unreadCount: 0,
    lastMessagePreview: null,
    status: "OPEN",
    createdAt: now,
    updatedAt: now,
    aiState,
  };
}

describe("generateOperatorSuggestion", () => {
  it("lead → perguntar necessidade", () => {
    const s = generateOperatorSuggestion(thinThread("lead"));
    expect(s).toMatch(/necessidade|ajudar/i);
  });

  it("negotiating → fechar", () => {
    const s = generateOperatorSuggestion(thinThread("negotiating"));
    expect(s).toMatch(/plano|fechar|opção/i);
  });
});
