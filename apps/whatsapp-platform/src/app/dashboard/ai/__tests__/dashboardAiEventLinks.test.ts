import { describe, expect, it } from "vitest";
import {
  buildInboxConversationHref,
  inboxConversationLinkLabel,
  normalizeConversationId,
} from "../dashboardAiEventLinks";

describe("normalizeConversationId", () => {
  it("aceita IDs válidos", () => {
    expect(normalizeConversationId("th-abc123")).toBe("th-abc123");
    expect(normalizeConversationId("  cuid_xyz  ")).toBe("cuid_xyz");
  });

  it("rejeita ausente/inválido (fail-closed)", () => {
    expect(normalizeConversationId(null)).toBeNull();
    expect(normalizeConversationId(undefined)).toBeNull();
    expect(normalizeConversationId("")).toBeNull();
    expect(normalizeConversationId("   ")).toBeNull();
    expect(normalizeConversationId("null")).toBeNull();
    expect(normalizeConversationId("undefined")).toBeNull();
    expect(normalizeConversationId("-")).toBeNull();
    expect(normalizeConversationId("id with space")).toBeNull();
  });
});

describe("buildInboxConversationHref", () => {
  it("gera /inbox?thread= codificado", () => {
    expect(buildInboxConversationHref("th-1")).toBe("/inbox?thread=th-1");
    expect(buildInboxConversationHref("a/b+c")).toBe(`/inbox?thread=${encodeURIComponent("a/b+c")}`);
  });

  it("não gera link quebrado sem conversa", () => {
    expect(buildInboxConversationHref(null)).toBeNull();
    expect(buildInboxConversationHref("")).toBeNull();
    expect(buildInboxConversationHref("null")).toBeNull();
  });
});

describe("inboxConversationLinkLabel", () => {
  it("fornece nome acessível com truncagem estável", () => {
    expect(inboxConversationLinkLabel("th-1")).toBe("Abrir conversa th-1 na Inbox");
    expect(inboxConversationLinkLabel("abcdefghijklmnop")).toBe(
      "Abrir conversa abcdefghijkl… na Inbox"
    );
  });
});
