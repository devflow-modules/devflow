import { describe, it, expect } from "vitest";
import {
  agentPromptInputFromConfigAndChannel,
  resolveEffectiveAutoReply,
} from "../channelAiBehavior";

function mockConfig(over: Record<string, unknown> = {}) {
  return {
    id: "a1",
    tenantId: "t1",
    enabled: true,
    autoReply: true,
    tone: "NEUTRAL" as const,
    maxTokens: 256,
    temperature: 0.5,
    model: "gpt-4o-mini",
    rules: ["regra base"],
    forbiddenTopics: [] as string[],
    handoffTriggers: [] as string[],
    assistantName: null,
    businessContext: "Contexto tenant",
    goal: null,
    runtimeDriver: null,
    fallbackToHuman: true,
    playbookJson: null,
    configVersion: 1,
    updatedByUserId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  };
}

describe("channelAiBehavior", () => {
  it("resolveEffectiveAutoReply: null/undefined herda tenant", () => {
    expect(resolveEffectiveAutoReply(true, null)).toBe(true);
    expect(resolveEffectiveAutoReply(false, null)).toBe(false);
    expect(resolveEffectiveAutoReply(true, undefined)).toBe(true);
  });

  it("resolveEffectiveAutoReply: boolean explícito substitui tenant", () => {
    expect(resolveEffectiveAutoReply(true, false)).toBe(false);
    expect(resolveEffectiveAutoReply(false, true)).toBe(true);
  });

  it("agentPromptInputFromConfigAndChannel: sem override mantém base", () => {
    const cfg = mockConfig();
    const input = agentPromptInputFromConfigAndChannel(cfg as never, null);
    expect(input.businessContext).toBe("Contexto tenant");
  });

  it("agentPromptInputFromConfigAndChannel: override prefixa contexto", () => {
    const cfg = mockConfig();
    const input = agentPromptInputFromConfigAndChannel(
      cfg as never,
      "Nesta linha: foco em prospecção B2B."
    );
    expect(input.businessContext).toContain("Nesta linha: foco em prospecção B2B.");
    expect(input.businessContext).toContain("Contexto tenant");
  });

  it("agentPromptInputFromConfigAndChannel: só override preenche contexto", () => {
    const cfg = mockConfig({ businessContext: null, rules: [] as string[] });
    const input = agentPromptInputFromConfigAndChannel(cfg as never, "Só canal");
    expect(input.businessContext).toBe("Só canal");
  });
});
