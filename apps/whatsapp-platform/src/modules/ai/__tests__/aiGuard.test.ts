import { describe, it, expect } from "vitest";
import {
  AI_GUARD_MAX_INBOUND_CHARS,
  shouldAiReply,
  isOutsideDefaultBusinessHours,
} from "../aiGuard";
import { WaInboxThreadStatus } from "@/generated/prisma-whatsapp";
import type { AiAgentConfig } from "@/generated/prisma-whatsapp";

function baseConfig(over: Partial<AiAgentConfig> = {}): AiAgentConfig {
  return {
    enabled: true,
    autoReply: true,
    outOfHoursReply: null,
    ...over,
  } as AiAgentConfig;
}

const threadOpen = {
  id: "th1",
  status: WaInboxThreadStatus.OPEN,
  assignedToUserId: null as string | null,
};

describe("shouldAiReply", () => {
  it("bloqueia mensagem vazia", () => {
    const d = shouldAiReply({
      messageText: "   ",
      config: baseConfig(),
      thread: threadOpen,
    });
    expect(d.allow).toBe(false);
    expect(d.reason).toBe("empty_message");
  });

  it("bloqueia IA desativada", () => {
    const d = shouldAiReply({
      messageText: "oi",
      config: baseConfig({ enabled: false }),
      thread: threadOpen,
    });
    expect(d.allow).toBe(false);
    expect(d.reason).toBe("ai_disabled");
  });

  it("bloqueia autoReply=false", () => {
    const d = shouldAiReply({
      messageText: "oi",
      config: baseConfig({ autoReply: false }),
      thread: threadOpen,
    });
    expect(d.allow).toBe(false);
    expect(d.reason).toBe("auto_reply_off");
  });

  it("bloqueia mensagem demasiado longa", () => {
    const d = shouldAiReply({
      messageText: "x".repeat(AI_GUARD_MAX_INBOUND_CHARS + 1),
      config: baseConfig(),
      thread: threadOpen,
    });
    expect(d.allow).toBe(false);
    expect(d.reason).toBe("message_too_long");
  });

  it.each([
    ["processo"],
    ["PROCON"],
    ["reclamação"],
    ["reclamacao"],
    ["cancelar"],
  ] as const)("bloqueia palavra sensível: %s", (word) => {
    const d = shouldAiReply({
      messageText: `quero falar de ${word}`,
      config: baseConfig(),
      thread: threadOpen,
    });
    expect(d.allow).toBe(false);
    expect(d.reason).toContain("sensitive_keyword");
  });

  it("bloqueia thread não aberta", () => {
    const d = shouldAiReply({
      messageText: "oi",
      config: baseConfig(),
      thread: { ...threadOpen, status: WaInboxThreadStatus.CLOSED },
    });
    expect(d.allow).toBe(false);
    expect(d.reason).toBe("thread_not_open");
  });

  it("bloqueia quando humano atribuído", () => {
    const d = shouldAiReply({
      messageText: "oi",
      config: baseConfig(),
      thread: { ...threadOpen, assignedToUserId: "u1" },
    });
    expect(d.allow).toBe(false);
    expect(d.reason).toBe("human_assigned");
  });

  it("fora do horário quando outOfHoursReply preenchido", () => {
    const sat = new Date("2026-04-11T12:00:00.000Z");
    expect(isOutsideDefaultBusinessHours(sat)).toBe(true);
    const d = shouldAiReply({
      messageText: "oi",
      config: baseConfig({ outOfHoursReply: "Volte amanhã" }),
      thread: threadOpen,
      now: sat,
    });
    expect(d.allow).toBe(false);
    expect(d.reason).toBe("outside_business_hours");
  });

  it("permite quando ok", () => {
    const d = shouldAiReply({
      messageText: "preciso de um orçamento",
      config: baseConfig(),
      thread: threadOpen,
      now: new Date("2026-04-08T15:00:00.000Z"),
    });
    expect(d.allow).toBe(true);
    expect(d.reason).toBe("ok");
  });

  it("outOfHoursReply null não bloqueia por horário", () => {
    const sat = new Date("2026-04-11T12:00:00.000Z");
    const d = shouldAiReply({
      messageText: "oi",
      config: baseConfig({ outOfHoursReply: null }),
      thread: threadOpen,
      now: sat,
    });
    expect(d.allow).toBe(true);
  });
});
