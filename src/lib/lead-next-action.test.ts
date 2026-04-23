import { describe, it, expect } from "vitest";
import { getNextAction } from "./lead-next-action";

describe("getNextAction (NBA)", () => {
  it("novo → first_contact, prioridade alta se nunca contatado", () => {
    const n = getNextAction({ status: "novo", lastContactAt: null }, new Date("2026-01-10T12:00:00Z"));
    expect(n.type).toBe("first_contact");
    expect(n.priority).toBe("high");
  });

  it("contato_iniciado → qualify", () => {
    const n = getNextAction(
      { status: "contato_iniciado", lastContactAt: new Date("2026-01-01T12:00:00Z") },
      new Date("2026-01-10T12:00:00Z")
    );
    expect(n.type).toBe("qualify");
  });

  it("respondeu → send_demo", () => {
    const n = getNextAction(
      { status: "respondeu", lastContactAt: new Date("2026-01-08T12:00:00Z") },
      new Date("2026-01-10T12:00:00Z")
    );
    expect(n.type).toBe("send_demo");
  });

  it("demo_enviada: follow_up e prioridade alta se >2d sem contato", () => {
    const n = getNextAction(
      { status: "demo_enviada", lastContactAt: new Date("2026-01-01T12:00:00Z") },
      new Date("2026-01-10T12:00:00Z")
    );
    expect(n.type).toBe("follow_up");
    expect(n.priority).toBe("high");
  });

  it("demo_enviada: prioridade baixa se contato recente (≤2d)", () => {
    const n = getNextAction(
      { status: "demo_enviada", lastContactAt: new Date("2026-01-09T12:00:00Z") },
      new Date("2026-01-10T12:00:00Z")
    );
    expect(n.type).toBe("follow_up");
    expect(n.priority).toBe("low");
  });

  it("negociacao + conversationRef → close", () => {
    const n = getNextAction(
      { status: "negociacao", lastContactAt: new Date(), conversationRef: "thr-1" },
      new Date()
    );
    expect(n.type).toBe("close");
  });

  it("negociacao sem conversa → handoff", () => {
    const n = getNextAction(
      { status: "negociacao", lastContactAt: new Date(), conversationRef: null },
      new Date()
    );
    expect(n.type).toBe("handoff");
  });

  it("encerrado → none", () => {
    const n = getNextAction(
      { status: "fechado", lastContactAt: new Date() },
      new Date()
    );
    expect(n.type).toBe("none");
  });

  it("follow-up atrasado (nextFollowUpAt) → high", () => {
    const n = getNextAction(
      {
        status: "qualificado",
        lastContactAt: new Date("2026-01-09T12:00:00Z"),
        nextFollowUpAt: "2026-01-01T10:00:00.000Z",
      },
      new Date("2026-01-10T12:00:00Z")
    );
    expect(n.priority).toBe("high");
  });
});
