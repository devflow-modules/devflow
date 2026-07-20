import { describe, it, expect, vi, beforeEach } from "vitest";
import { WaInboxThreadStatus, WaInboxDirection } from "@/generated/prisma-whatsapp";

const mockFindNext = vi.fn();
const mockAssignThread = vi.fn();
const mockLogEvent = vi.fn();

vi.mock("../waInboxQueueService", () => ({
  findNextUnassignedQueueThread: (...args: unknown[]) => mockFindNext(...args),
}));
vi.mock("../threadAssignmentService", () => ({
  assignThread: (...args: unknown[]) => mockAssignThread(...args),
}));
vi.mock("@/lib/observability", () => ({
  logEvent: (...args: unknown[]) => mockLogEvent(...args),
}));

function sampleThread(id = "th1") {
  const lastMsgAt = new Date("2025-01-01T11:00:00Z");
  return {
    id,
    tenantId: "t1",
    phoneNumber: "5511999999999",
    contactName: "Cliente",
    status: WaInboxThreadStatus.OPEN,
    lastMessageAt: lastMsgAt,
    createdAt: new Date("2025-01-01T10:00:00Z"),
    messages: [
      {
        id: "m1",
        direction: WaInboxDirection.INBOUND,
        contentText: "Oi",
        ts: lastMsgAt,
      },
    ],
  };
}

describe("runQueueNext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fila vazia → ok com thread null", async () => {
    mockFindNext.mockResolvedValue(null);
    const { runQueueNext } = await import("../inboxQueueNext");
    const result = await runQueueNext({
      tenantId: "t1",
      userId: "u1",
      role: "operator",
      assign: true,
    });
    expect(result).toEqual({
      ok: true,
      thread: null,
      message: "Nenhuma conversa na fila",
      priority: 0,
      queuedAt: null,
    });
    expect(mockAssignThread).not.toHaveBeenCalled();
  });

  it("assign sucesso → devolve thread", async () => {
    mockFindNext.mockResolvedValue(sampleThread());
    mockAssignThread.mockResolvedValue({ ok: true, changed: true });
    const { runQueueNext } = await import("../inboxQueueNext");
    const result = await runQueueNext({
      tenantId: "t1",
      userId: "u1",
      role: "operator",
      assign: true,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.thread?.id).toBe("th1");
    }
  });

  it("assign conflict → ok false sem thread", async () => {
    mockFindNext.mockResolvedValue(sampleThread());
    mockAssignThread.mockResolvedValue({ ok: false, reason: "conflict" });
    const { runQueueNext } = await import("../inboxQueueNext");
    const result = await runQueueNext({
      tenantId: "t1",
      userId: "u2",
      role: "operator",
      assign: true,
    });
    expect(result).toMatchObject({
      ok: false,
      reason: "conflict",
    });
    expect(result.ok === false && "thread" in result).toBe(false);
  });

  it("assign closed/not_found → ok false sem thread", async () => {
    mockFindNext.mockResolvedValue(sampleThread());
    const { runQueueNext } = await import("../inboxQueueNext");

    mockAssignThread.mockResolvedValue({ ok: false, reason: "closed" });
    const closed = await runQueueNext({
      tenantId: "t1",
      userId: "u1",
      role: "operator",
      assign: true,
    });
    expect(closed).toMatchObject({ ok: false, reason: "closed" });

    mockAssignThread.mockResolvedValue({ ok: false, reason: "not_found" });
    const missing = await runQueueNext({
      tenantId: "t1",
      userId: "u1",
      role: "operator",
      assign: true,
    });
    expect(missing).toMatchObject({ ok: false, reason: "not_found" });
  });

  it("duas claims concorrentes: só a primeira recebe thread", async () => {
    mockFindNext.mockResolvedValue(sampleThread("th-shared"));
    mockAssignThread
      .mockResolvedValueOnce({ ok: true, changed: true })
      .mockResolvedValueOnce({ ok: false, reason: "conflict" });

    const { runQueueNext } = await import("../inboxQueueNext");
    const first = await runQueueNext({
      tenantId: "t1",
      userId: "u-a",
      role: "operator",
      assign: true,
    });
    const second = await runQueueNext({
      tenantId: "t1",
      userId: "u-b",
      role: "operator",
      assign: true,
    });

    expect(first.ok).toBe(true);
    if (first.ok) expect(first.thread?.id).toBe("th-shared");
    expect(second).toMatchObject({ ok: false, reason: "conflict" });
  });

  it("assign=false devolve thread sem chamar assignThread", async () => {
    mockFindNext.mockResolvedValue(sampleThread());
    const { runQueueNext } = await import("../inboxQueueNext");
    const result = await runQueueNext({
      tenantId: "t1",
      userId: "u1",
      role: "operator",
      assign: false,
    });
    expect(result.ok).toBe(true);
    expect(mockAssignThread).not.toHaveBeenCalled();
  });
});
