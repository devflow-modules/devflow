import { describe, it, expect, vi, beforeEach } from "vitest";
import { WaInboxThreadStatus } from "@/generated/prisma-whatsapp";

const mockPublish = vi.fn();
const mockLogAction = vi.fn().mockResolvedValue(undefined);

const mockPrisma = {
  user: { findFirst: vi.fn(), findMany: vi.fn() },
  waInboxThread: { updateMany: vi.fn(), findMany: vi.fn(), findFirst: vi.fn() },
  agentStatus: { upsert: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  waInboxAuditLog: { create: vi.fn().mockResolvedValue({}) },
};

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/realtime/realtime.service", () => ({
  publishInboxEvent: (...args: unknown[]) => mockPublish(...args),
  eventConversationAssigned: (_t: string, p: unknown) => ({
    type: "conversation.assigned",
    payload: p,
  }),
}));
vi.mock("../auditService", () => ({
  logAction: (...args: unknown[]) => mockLogAction(...args),
}));

const targetUser = {
  id: "u1",
  name: "Ana",
  email: "ana@x.com",
  role: "operator",
};

describe("threadAssignmentService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogAction.mockResolvedValue(undefined);
    mockPrisma.agentStatus.upsert.mockResolvedValue({});
    mockPrisma.agentStatus.findUnique.mockResolvedValue(null);
  });

  it("claim sem owner atribui com CAS e audita previous null", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(targetUser);
    mockPrisma.waInboxThread.findFirst.mockResolvedValue({
      assignedToUserId: null,
      status: WaInboxThreadStatus.OPEN,
    });
    mockPrisma.waInboxThread.updateMany.mockResolvedValue({ count: 1 });

    const { assignThread } = await import("../threadAssignmentService");
    const result = await assignThread("tenant1", "thread1", "u1", "u1", "operator");

    expect(result).toEqual({ ok: true, changed: true });
    expect(mockPrisma.waInboxThread.updateMany).toHaveBeenCalledWith({
      where: {
        id: "thread1",
        tenantId: "tenant1",
        assignedToUserId: null,
        status: { not: WaInboxThreadStatus.CLOSED },
      },
      data: { assignedToUserId: "u1" },
    });
    expect(mockLogAction).toHaveBeenCalledWith("tenant1", "thread1", "u1", "assign", {
      previousAssigneeId: null,
      assignedToUserId: "u1",
    });
    expect(mockPublish).toHaveBeenCalled();
  });

  it("claim já sendo owner é no-op sem side effects", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(targetUser);
    mockPrisma.waInboxThread.findFirst.mockResolvedValue({
      assignedToUserId: "u1",
      status: WaInboxThreadStatus.OPEN,
    });

    const { assignThread } = await import("../threadAssignmentService");
    const result = await assignThread("tenant1", "thread1", "u1", "u1", "operator");

    expect(result).toEqual({ ok: true, changed: false });
    expect(mockPrisma.waInboxThread.updateMany).not.toHaveBeenCalled();
    expect(mockLogAction).not.toHaveBeenCalled();
    expect(mockPublish).not.toHaveBeenCalled();
  });

  it("claim quando outro owner existe → conflict", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(targetUser);
    mockPrisma.waInboxThread.findFirst.mockResolvedValue({
      assignedToUserId: "u-other",
      status: WaInboxThreadStatus.OPEN,
    });

    const { assignThread } = await import("../threadAssignmentService");
    const result = await assignThread("tenant1", "thread1", "u1", "u1", "operator");

    expect(result).toEqual({ ok: false, reason: "conflict" });
    expect(mockPrisma.waInboxThread.updateMany).not.toHaveBeenCalled();
  });

  it("dois claims concorrentes: segundo CAS miss → conflict se outro ficou owner", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(targetUser);
    mockPrisma.waInboxThread.findFirst
      .mockResolvedValueOnce({ assignedToUserId: null, status: WaInboxThreadStatus.OPEN })
      .mockResolvedValueOnce({ assignedToUserId: null, status: WaInboxThreadStatus.OPEN })
      .mockResolvedValueOnce({ assignedToUserId: "u2", status: WaInboxThreadStatus.OPEN });
    mockPrisma.waInboxThread.updateMany.mockResolvedValue({ count: 0 });

    const { assignThread } = await import("../threadAssignmentService");
    const result = await assignThread("tenant1", "thread1", "u1", "u1", "operator");

    expect(result).toEqual({ ok: false, reason: "conflict" });
    expect(mockLogAction).not.toHaveBeenCalled();
  });

  it("CAS miss + segunda leitura já no target → sucesso idempotente", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(targetUser);
    mockPrisma.waInboxThread.findFirst
      .mockResolvedValueOnce({ assignedToUserId: null, status: WaInboxThreadStatus.OPEN })
      .mockResolvedValueOnce({ assignedToUserId: "u1", status: WaInboxThreadStatus.OPEN });
    mockPrisma.waInboxThread.updateMany.mockResolvedValue({ count: 0 });

    const { assignThread } = await import("../threadAssignmentService");
    const result = await assignThread("tenant1", "thread1", "u1", "u1", "operator");

    expect(result).toEqual({ ok: true, changed: false });
    expect(mockLogAction).not.toHaveBeenCalled();
  });

  it("transfer pelo owner", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      id: "u2",
      name: "Bruno",
      email: "b@x.com",
      role: "operator",
    });
    mockPrisma.waInboxThread.findFirst.mockResolvedValue({
      assignedToUserId: "u1",
      status: WaInboxThreadStatus.OPEN,
    });
    mockPrisma.waInboxThread.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.agentStatus.findUnique.mockResolvedValue({
      tenantId: "tenant1",
      currentConversationId: "thread1",
    });

    const { assignThread } = await import("../threadAssignmentService");
    const result = await assignThread("tenant1", "thread1", "u2", "u1", "operator");

    expect(result).toEqual({ ok: true, changed: true });
    expect(mockPrisma.waInboxThread.updateMany).toHaveBeenCalledWith({
      where: {
        id: "thread1",
        tenantId: "tenant1",
        assignedToUserId: "u1",
        status: { not: WaInboxThreadStatus.CLOSED },
      },
      data: { assignedToUserId: "u2" },
    });
    expect(mockLogAction).toHaveBeenCalledWith("tenant1", "thread1", "u1", "assign", {
      previousAssigneeId: "u1",
      assignedToUserId: "u2",
    });
  });

  it("transfer por manager", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      id: "u2",
      name: "Bruno",
      email: "b@x.com",
      role: "operator",
    });
    mockPrisma.waInboxThread.findFirst.mockResolvedValue({
      assignedToUserId: "u1",
      status: WaInboxThreadStatus.OPEN,
    });
    mockPrisma.waInboxThread.updateMany.mockResolvedValue({ count: 1 });

    const { assignThread } = await import("../threadAssignmentService");
    const result = await assignThread("tenant1", "thread1", "u2", "mgr", "manager");
    expect(result).toEqual({ ok: true, changed: true });
  });

  it("transfer proibido para operador terceiro", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      id: "u2",
      name: "Bruno",
      email: "b@x.com",
      role: "operator",
    });
    mockPrisma.waInboxThread.findFirst.mockResolvedValue({
      assignedToUserId: "u1",
      status: WaInboxThreadStatus.OPEN,
    });

    const { assignThread } = await import("../threadAssignmentService");
    const result = await assignThread("tenant1", "thread1", "u2", "u3", "operator");
    expect(result).toEqual({ ok: false, reason: "forbidden" });
  });

  it("liberar pelo owner", async () => {
    mockPrisma.waInboxThread.findFirst.mockResolvedValue({
      assignedToUserId: "u1",
      status: WaInboxThreadStatus.OPEN,
    });
    mockPrisma.waInboxThread.updateMany.mockResolvedValue({ count: 1 });

    const { unassignThread } = await import("../threadAssignmentService");
    const result = await unassignThread("tenant1", "thread1", "u1", "operator");

    expect(result).toEqual({ ok: true, changed: true });
    expect(mockLogAction).toHaveBeenCalledWith("tenant1", "thread1", "u1", "unassign", {
      previousAssigneeId: "u1",
      assignedToUserId: null,
    });
  });

  it("liberar por manager", async () => {
    mockPrisma.waInboxThread.findFirst.mockResolvedValue({
      assignedToUserId: "u1",
      status: WaInboxThreadStatus.OPEN,
    });
    mockPrisma.waInboxThread.updateMany.mockResolvedValue({ count: 1 });

    const { unassignThread } = await import("../threadAssignmentService");
    const result = await unassignThread("tenant1", "thread1", "mgr", "manager");
    expect(result).toEqual({ ok: true, changed: true });
  });

  it("liberar por operador terceiro → forbidden", async () => {
    mockPrisma.waInboxThread.findFirst.mockResolvedValue({
      assignedToUserId: "u1",
      status: WaInboxThreadStatus.OPEN,
    });

    const { unassignThread } = await import("../threadAssignmentService");
    const result = await unassignThread("tenant1", "thread1", "u3", "operator");
    expect(result).toEqual({ ok: false, reason: "forbidden" });
  });

  it("null → null é no-op", async () => {
    mockPrisma.waInboxThread.findFirst.mockResolvedValue({
      assignedToUserId: null,
      status: WaInboxThreadStatus.OPEN,
    });

    const { unassignThread } = await import("../threadAssignmentService");
    const result = await unassignThread("tenant1", "thread1", "u1", "operator");
    expect(result).toEqual({ ok: true, changed: false });
    expect(mockPrisma.waInboxThread.updateMany).not.toHaveBeenCalled();
    expect(mockLogAction).not.toHaveBeenCalled();
  });

  it("destino fora do tenant → target_not_found", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);
    const { assignThread } = await import("../threadAssignmentService");
    const result = await assignThread("tenant1", "thread1", "u-other", "u1", "operator");
    expect(result).toEqual({ ok: false, reason: "target_not_found" });
  });

  it("destino sem role operacional → target_not_found", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      id: "u9",
      name: "X",
      email: "x@x.com",
      role: "billing_viewer",
    });
    const { assignThread } = await import("../threadAssignmentService");
    const result = await assignThread("tenant1", "thread1", "u9", "u1", "manager");
    expect(result).toEqual({ ok: false, reason: "target_not_found" });
  });

  it("thread inexistente → not_found", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(targetUser);
    mockPrisma.waInboxThread.findFirst.mockResolvedValue(null);
    const { assignThread } = await import("../threadAssignmentService");
    const result = await assignThread("tenant1", "missing", "u1", "u1", "operator");
    expect(result).toEqual({ ok: false, reason: "not_found" });
  });

  it("thread CLOSED → closed", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(targetUser);
    mockPrisma.waInboxThread.findFirst.mockResolvedValue({
      assignedToUserId: null,
      status: WaInboxThreadStatus.CLOSED,
    });
    const { assignThread } = await import("../threadAssignmentService");
    const result = await assignThread("tenant1", "thread1", "u1", "u1", "operator");
    expect(result).toEqual({ ok: false, reason: "closed" });
  });
});
