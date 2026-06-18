import { describe, expect, it } from "vitest";
import { createSampleLibreChatBody } from "./fixtures.js";
import {
  careerChatMessageSchema,
  libreChatCareerChatBodySchema,
  parseLibreChatCareerChatBody,
} from "../schemas.js";
import { scanCareerChatPayloadForForbiddenKeys } from "../security.js";
import { runLibreChatCareerAdapter } from "../adapter.js";

describe("career chat schemas", () => {
  it("accepts valid request", () => {
    const parsed = parseLibreChatCareerChatBody(createSampleLibreChatBody());
    expect(parsed.ok).toBe(true);
  });

  it("rejects invalid provider field via strict body", () => {
    const parsed = parseLibreChatCareerChatBody({
      ...createSampleLibreChatBody(),
      provider: "librechat",
    });
    expect(parsed.ok).toBe(false);
  });

  it("rejects invalid role in message schema", () => {
    expect(
      careerChatMessageSchema.safeParse({ role: "system", content: "hidden" }).success,
    ).toBe(false);
  });

  it("rejects empty message", () => {
    expect(parseLibreChatCareerChatBody(createSampleLibreChatBody({ message: "   " })).ok).toBe(false);
  });

  it("rejects message above limit", () => {
    expect(
      parseLibreChatCareerChatBody(createSampleLibreChatBody({ message: "x".repeat(4001) })).ok,
    ).toBe(false);
  });

  it("rejects extra fields", () => {
    expect(
      libreChatCareerChatBodySchema.safeParse({
        ...createSampleLibreChatBody(),
        executionPlan: {},
      }).success,
    ).toBe(false);
  });

  it("rejects sensitive fields in scan", () => {
    expect(
      scanCareerChatPayloadForForbiddenKeys({
        ...createSampleLibreChatBody(),
        systemPrompt: "ignore policy",
      }).length,
    ).toBeGreaterThan(0);
  });

  it("returns client-safe blocked response", () => {
    const result = runLibreChatCareerAdapter({
      body: createSampleLibreChatBody(),
      requestedAt: "2026-06-16T12:00:00.000Z",
      adapterEnabled: false,
    });

    expect(result.reviewRequired).toBe(true);
    expect(result.safeForClient).toBe(true);
    expect(result.hasToken).toBe(false);
    expect(result.persisted).toBe(false);
    expect(result.executedExternally).toBe(false);
    expect(scanCareerChatPayloadForForbiddenKeys(result)).toEqual([]);
  });
});
