import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AutomationContext } from "../automation.types";

const mockAssignThread = vi.fn();

vi.mock("@/modules/inbox", () => ({
  assignThread: (...args: unknown[]) => mockAssignThread(...args),
  updateThreadStatus: vi.fn(),
  assignTagToThread: vi.fn(),
  removeTagFromThread: vi.fn(),
  logAction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    waInboxTag: { findFirst: vi.fn() },
  },
}));

vi.mock("@/modules/ai/aiAutomationService", () => ({
  checkTenantAiAutomationReady: vi.fn(),
  runTenantAiAutoReply: vi.fn(),
}));

vi.mock("@/modules/whatsapp/whatsappPhoneResolution", () => ({
  resolveMessagingTenantForOutbound: vi.fn(),
}));

vi.mock("@/modules/messaging/sendMessageService", () => ({
  sendWebhookAutoReply: vi.fn(),
}));

const automationContext = {
  tenantId: "t1",
  threadId: "th1",
  depth: 0,
  executionId: "exec-test-1",
  ruleIdsExecuted: new Set<string>(),
} satisfies AutomationContext;

describe("action.executor assignConversation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("bloqueia userId auto com automatic_assignment_not_configured", async () => {
    const { executeAction } = await import("../action.executor");
    const result = await executeAction(
      { type: "assignConversation", params: { userId: "auto" } },
      automationContext
    );
    expect(result).toEqual({ ok: false, error: "automatic_assignment_not_configured" });
    expect(mockAssignThread).not.toHaveBeenCalled();
  });

  it("bloqueia userId ausente", async () => {
    const { executeAction } = await import("../action.executor");
    const result = await executeAction(
      { type: "assignConversation", params: {} },
      automationContext
    );
    expect(result).toEqual({ ok: false, error: "automatic_assignment_not_configured" });
  });

  it("userId explícito chama assignThread com role system", async () => {
    mockAssignThread.mockResolvedValue({ ok: true, changed: true });
    const { executeAction } = await import("../action.executor");
    const result = await executeAction(
      { type: "assignConversation", params: { userId: "u2" } },
      automationContext
    );
    expect(result).toEqual({ ok: true });
    expect(mockAssignThread).toHaveBeenCalledWith("t1", "th1", "u2", "automation", "system");
  });
});
