/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { resolveComposerAuthorshipLock } from "../composerAuthorshipLock";
import type { WaInboxThreadRow } from "../inboxTypes";

function baseThread(over: Partial<WaInboxThreadRow> = {}): WaInboxThreadRow {
  return {
    id: "t1",
    phoneNumber: "5511",
    businessPhoneNumberId: "pn1",
    contactName: "Cliente",
    lastMessageAt: new Date().toISOString(),
    unreadCount: 0,
    lastMessagePreview: null,
    status: "OPEN",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isUnassigned: true,
    isAssignedToMe: false,
    assignedToUser: null,
    ...over,
  };
}

describe("resolveComposerAuthorshipLock", () => {
  it("prioriza canal inativo", () => {
    const lock = resolveComposerAuthorshipLock({
      thread: baseThread({ status: "CLOSED" }),
      outboundEnabled: false,
      sessionRole: "operator",
      sessionLoading: false,
      sessionKnown: true,
    });
    expect(lock?.kind).toBe("channel");
  });

  it("CLOSED → reopen", () => {
    const lock = resolveComposerAuthorshipLock({
      thread: baseThread({ status: "CLOSED" }),
      outboundEnabled: true,
      sessionRole: "operator",
      sessionLoading: false,
      sessionKnown: true,
    });
    expect(lock).toEqual(
      expect.objectContaining({ kind: "closed", action: "reopen" })
    );
  });

  it("outro assignee: operator sem assume; manager com assume", () => {
    const thread = baseThread({
      isUnassigned: false,
      isAssignedToMe: false,
      assignedToUser: { id: "u2", name: "Outro", email: "o@x.com" },
    });
    expect(
      resolveComposerAuthorshipLock({
        thread,
        outboundEnabled: true,
        sessionRole: "operator",
        sessionLoading: false,
        sessionKnown: true,
      })?.action
    ).toBeNull();
    expect(
      resolveComposerAuthorshipLock({
        thread,
        outboundEnabled: true,
        sessionRole: "manager",
        sessionLoading: false,
        sessionKnown: true,
      })?.action
    ).toBe("assume");
  });

  it("fail-closed se sessão desconhecida", () => {
    const lock = resolveComposerAuthorshipLock({
      thread: baseThread(),
      outboundEnabled: true,
      sessionRole: null,
      sessionLoading: false,
      sessionKnown: false,
    });
    expect(lock?.kind).toBe("session_unknown");
    expect(lock?.action).toBeNull();
  });

  it("sem lock quando OPEN e unassigned com sessão ok", () => {
    expect(
      resolveComposerAuthorshipLock({
        thread: baseThread(),
        outboundEnabled: true,
        sessionRole: "operator",
        sessionLoading: false,
        sessionKnown: true,
      })
    ).toBeNull();
  });
});
