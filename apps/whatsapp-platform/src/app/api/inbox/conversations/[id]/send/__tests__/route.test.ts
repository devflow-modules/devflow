import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { UsageLimitExceededError as UsageLimitExceededErrorType } from "@/modules/billing/enforcementService";
import type { UsageLimitErrorPayload } from "@/modules/billing/billingSanitizer";

const mocks = vi.hoisted(() => {
  class UsageLimitExceededError extends Error {}

  return {
    UsageLimitExceededError,
    adapterSendText: vi.fn(),
    assertSendable: vi.fn(),
    enforceUsage: vi.fn(),
    getAuth: vi.fn(),
    logAction: vi.fn(),
    logError: vi.fn(),
    logEvent: vi.fn(),
    resolveMessagingTenant: vi.fn(),
    sanitizeUsagePayload: vi.fn(
      (payload: UsageLimitErrorPayload, user: { role?: string }) => {
        void user;
        return payload;
      }
    ),
    trackUsage: vi.fn(),
    usageLimitPayload: vi.fn((error: UsageLimitExceededErrorType) => {
      void error;
      return {
        code: "FREE_PLAN_LIMIT_REACHED",
        message: "Limite atingido",
      };
    }),
    waInboxCreateOutbound: vi.fn(),
    findThread: vi.fn(),
    findTenant: vi.fn(),
    findWhatsappLine: vi.fn(),
    updateThread: vi.fn(),
    findSendRequest: vi.fn(),
    beginOrLoadSendRequest: vi.fn(),
    claimSendForMeta: vi.fn(),
    markSendFailedPreMeta: vi.fn(),
    markSendMetaAccepted: vi.fn(),
    markSendCompleted: vi.fn(),
    markSendPersistFailed: vi.fn(),
  };
});

vi.mock("@devflow/whatsapp-core", () => ({
  WhatsAppCloudAdapter: class {
    sendText = mocks.adapterSendText;
  },
}));

vi.mock("@/modules/auth", () => ({
  getAuthFromRequest: (...args: unknown[]) => mocks.getAuth(...args),
}));

vi.mock("@/modules/inbox", () => ({
  logAction: (...args: unknown[]) => mocks.logAction(...args),
  waInboxCreateOutbound: (...args: unknown[]) => mocks.waInboxCreateOutbound(...args),
}));

vi.mock("@/modules/inbox/outboundSendRequestService", () => ({
  SEND_ERROR_CODES: {
    IN_PROGRESS: "SEND_IN_PROGRESS",
    FAILED_PRE_META: "SEND_FAILED_PRE_META",
    ALREADY_DELIVERED_TO_META: "SEND_ALREADY_DELIVERED_TO_META",
    STATUS_UNKNOWN: "SEND_STATUS_UNKNOWN",
    TEXT_MISMATCH: "SEND_TEXT_MISMATCH",
  },
  findSendRequest: (...args: unknown[]) => mocks.findSendRequest(...args),
  beginOrLoadSendRequest: (...args: unknown[]) => mocks.beginOrLoadSendRequest(...args),
  claimSendForMeta: (...args: unknown[]) => mocks.claimSendForMeta(...args),
  markSendFailedPreMeta: (...args: unknown[]) => mocks.markSendFailedPreMeta(...args),
  markSendMetaAccepted: (...args: unknown[]) => mocks.markSendMetaAccepted(...args),
  markSendCompleted: (...args: unknown[]) => mocks.markSendCompleted(...args),
  markSendPersistFailed: (...args: unknown[]) => mocks.markSendPersistFailed(...args),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tenant: {
      findUnique: (...args: unknown[]) => mocks.findTenant(...args),
    },
    waInboxThread: {
      findFirst: (...args: unknown[]) => mocks.findThread(...args),
      update: (...args: unknown[]) => mocks.updateThread(...args),
    },
    whatsappPhoneNumber: {
      findFirst: (...args: unknown[]) => mocks.findWhatsappLine(...args),
    },
  },
}));

vi.mock("@/modules/whatsapp/whatsappPhoneResolution", () => ({
  resolveMessagingTenantForOutbound: (...args: unknown[]) =>
    mocks.resolveMessagingTenant(...args),
}));

vi.mock("@/modules/whatsapp/whatsappChannelGuards", () => ({
  assertWhatsappPhoneNumberSendable: (...args: unknown[]) => mocks.assertSendable(...args),
}));

vi.mock("@/modules/billing/enforcementService", () => ({
  enforceUsageOrThrow: (...args: unknown[]) => mocks.enforceUsage(...args),
  UsageLimitExceededError: mocks.UsageLimitExceededError,
  usageLimitErrorToPayload: (error: UsageLimitExceededErrorType) =>
    mocks.usageLimitPayload(error),
}));

vi.mock("@/modules/billing/billingSanitizer", () => ({
  sanitizeUsageLimitErrorPayload: (
    payload: UsageLimitErrorPayload,
    user: { role?: string }
  ) => mocks.sanitizeUsagePayload(payload, user),
}));

vi.mock("@/modules/billing/usageService", () => ({
  trackUsage: (...args: unknown[]) => mocks.trackUsage(...args),
}));

vi.mock("@/lib/observability", () => ({
  logError: (...args: unknown[]) => mocks.logError(...args),
  logEvent: (...args: unknown[]) => mocks.logEvent(...args),
}));

const auth = {
  payload: {
    tenantId: "tenant-1",
    sub: "operator-1",
    role: "operator",
  },
};

const thread = {
  id: "thread-1",
  tenantId: "tenant-1",
  assignedToUserId: "operator-2",
  businessPhoneNumberId: "phone-id-1",
  phoneNumber: "+55 (11) 99999-0000",
};

const line = {
  id: "line-1",
  tenantId: "tenant-1",
  phoneNumberId: "phone-id-1",
  status: "ACTIVE",
  accessToken: "test-token",
};

const messagingTenant = {
  accessToken: "test-token",
  displayPhoneNumber: "+55 (11) 3333-4444",
  phoneNumberId: "phone-id-1",
};

const CLIENT_REQUEST_ID = "11111111-2222-4333-8444-555555555555";

function request(body: unknown = { text: "Resposta do agente", clientRequestId: CLIENT_REQUEST_ID }) {
  return new NextRequest("http://localhost/api/inbox/conversations/thread-1/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function post(body?: unknown, id = "thread-1") {
  const { POST } = await import("../route");
  return POST(request(body), { params: Promise.resolve({ id }) });
}

const pendingLedger = {
  id: "ledger-1",
  tenantId: "tenant-1",
  threadId: "thread-1",
  userId: "operator-1",
  clientRequestId: CLIENT_REQUEST_ID,
  text: "Resposta do agente",
  status: "PENDING" as const,
  waMessageId: null,
  lastError: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("POST /api/inbox/conversations/[id]/send", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assertSendable.mockReset();
    mocks.getAuth.mockResolvedValue(auth);
    mocks.findThread.mockResolvedValue(thread);
    mocks.findTenant.mockResolvedValue({ id: "tenant-1" });
    mocks.findWhatsappLine.mockResolvedValue(line);
    mocks.resolveMessagingTenant.mockResolvedValue(messagingTenant);
    mocks.adapterSendText.mockResolvedValue({ messageId: "wamid.outbound-1" });
    mocks.waInboxCreateOutbound.mockResolvedValue(undefined);
    mocks.updateThread.mockResolvedValue(thread);
    mocks.logAction.mockResolvedValue(undefined);
    mocks.enforceUsage.mockResolvedValue(undefined);
    mocks.findSendRequest.mockResolvedValue(null);
    mocks.beginOrLoadSendRequest.mockResolvedValue(pendingLedger);
    mocks.claimSendForMeta.mockResolvedValue(true);
    mocks.markSendFailedPreMeta.mockResolvedValue(undefined);
    mocks.markSendMetaAccepted.mockResolvedValue(undefined);
    mocks.markSendCompleted.mockResolvedValue(undefined);
    mocks.markSendPersistFailed.mockResolvedValue(undefined);
  });

  it("retorna 401 sem autenticação e não acessa a conversa", async () => {
    mocks.getAuth.mockResolvedValue(null);

    const response = await post();

    expect(response.status).toBe(401);
    expect(mocks.findThread).not.toHaveBeenCalled();
    expect(mocks.adapterSendText).not.toHaveBeenCalled();
  });

  it("retorna 400 sem clientRequestId", async () => {
    const response = await post({ text: "oi" });
    expect(response.status).toBe(400);
    expect(mocks.adapterSendText).not.toHaveBeenCalled();
  });

  it("retorna 404 para conversa fora do tenant e filtra a consulta pela sessão", async () => {
    mocks.findThread.mockResolvedValue(null);

    const response = await post();

    expect(response.status).toBe(404);
    expect(mocks.findThread).toHaveBeenCalledWith({
      where: { id: "thread-1", tenantId: "tenant-1" },
    });
    expect(mocks.adapterSendText).not.toHaveBeenCalled();
  });

  it("preserva 402 quando o limite de mensagens bloqueia o envio", async () => {
    mocks.enforceUsage.mockRejectedValue(
      new mocks.UsageLimitExceededError("Limite atingido")
    );

    const response = await post();
    const json = await response.json();

    expect(response.status).toBe(402);
    expect(json).toEqual({
      success: false,
      error: {
        code: "FREE_PLAN_LIMIT_REACHED",
        message: "Limite atingido",
      },
    });
    expect(mocks.adapterSendText).not.toHaveBeenCalled();
  });

  it("preserva 403 quando o canal ainda não está ativo", async () => {
    mocks.assertSendable.mockImplementation(() => {
      throw new Error("CHANNEL_NOT_ACTIVE");
    });

    const response = await post();
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.error.code).toBe("CHANNEL_NOT_ACTIVE");
    expect(mocks.adapterSendText).not.toHaveBeenCalled();
  });

  it("preserva 503 quando o canal não está configurado", async () => {
    mocks.assertSendable.mockImplementation(() => {
      throw new Error("CHANNEL_NOT_CONFIGURED");
    });

    const response = await post();
    const json = await response.json();

    expect(response.status).toBe(503);
    expect(json.error.code).toBe("CHANNEL_NOT_CONFIGURED");
    expect(mocks.adapterSendText).not.toHaveBeenCalled();
  });

  it("retorna 503 quando as credenciais outbound não são resolvidas", async () => {
    mocks.resolveMessagingTenant.mockResolvedValue(null);

    const response = await post();

    expect(response.status).toBe(503);
    expect(mocks.resolveMessagingTenant).toHaveBeenCalledWith("tenant-1", "phone-id-1");
    expect(mocks.adapterSendText).not.toHaveBeenCalled();
  });

  it("falha pré-Meta: 502 retryableMeta e não persiste", async () => {
    mocks.adapterSendText.mockRejectedValue(new Error("Cloud indisponível"));

    const response = await post();
    const json = await response.json();

    expect(response.status).toBe(502);
    expect(json.error.code).toBe("SEND_FAILED_PRE_META");
    expect(json.error.retryableMeta).toBe(true);
    expect(mocks.waInboxCreateOutbound).not.toHaveBeenCalled();
    expect(mocks.markSendFailedPreMeta).toHaveBeenCalled();
    expect(mocks.adapterSendText).toHaveBeenCalledTimes(1);
  });

  it("sucesso: uma chamada Meta + ledger COMPLETED", async () => {
    const response = await post();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({
      success: true,
      data: {
        messageId: "wamid.outbound-1",
        waMessageId: "wamid.outbound-1",
        clientRequestId: CLIENT_REQUEST_ID,
        status: "sent",
        replayed: false,
      },
    });
    expect(mocks.adapterSendText).toHaveBeenCalledTimes(1);
    expect(mocks.claimSendForMeta).toHaveBeenCalledWith("ledger-1");
    expect(mocks.markSendMetaAccepted).toHaveBeenCalledWith("ledger-1", "wamid.outbound-1");
    expect(mocks.markSendCompleted).toHaveBeenCalledWith("ledger-1", "wamid.outbound-1");
    expect(mocks.waInboxCreateOutbound).toHaveBeenCalledTimes(1);
  });

  it("replay COMPLETED: não chama Meta de novo", async () => {
    mocks.findSendRequest.mockResolvedValue({
      ...pendingLedger,
      status: "COMPLETED",
      waMessageId: "wamid.outbound-1",
    });

    const response = await post();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.replayed).toBe(true);
    expect(mocks.adapterSendText).not.toHaveBeenCalled();
    expect(mocks.waInboxCreateOutbound).not.toHaveBeenCalled();
  });

  it("falha pós-Meta: não reenvia Meta no retry; só reconcilia", async () => {
    mocks.waInboxCreateOutbound.mockRejectedValueOnce(new Error("db down"));

    const first = await post();
    const firstJson = await first.json();
    expect(first.status).toBe(502);
    expect(firstJson.error.code).toBe("SEND_ALREADY_DELIVERED_TO_META");
    expect(firstJson.error.retryableMeta).toBe(false);
    expect(firstJson.error.reconcileOnly).toBe(true);
    expect(mocks.adapterSendText).toHaveBeenCalledTimes(1);
    expect(mocks.markSendPersistFailed).toHaveBeenCalled();

    mocks.findSendRequest.mockResolvedValue({
      ...pendingLedger,
      status: "META_ACCEPTED",
      waMessageId: "wamid.outbound-1",
    });
    mocks.waInboxCreateOutbound.mockResolvedValue(undefined);

    const second = await post();
    const secondJson = await second.json();
    expect(second.status).toBe(200);
    expect(secondJson.data.waMessageId).toBe("wamid.outbound-1");
    expect(mocks.adapterSendText).toHaveBeenCalledTimes(1);
    expect(mocks.waInboxCreateOutbound).toHaveBeenCalledTimes(2);
  });

  it("claim perdido: 409 IN_PROGRESS sem Meta", async () => {
    mocks.claimSendForMeta.mockResolvedValue(false);
    mocks.findSendRequest
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...pendingLedger, status: "SENDING" });

    const response = await post();
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.error.code).toBe("SEND_IN_PROGRESS");
    expect(mocks.adapterSendText).not.toHaveBeenCalled();
  });

  it("duas POSTs simultâneas com o mesmo clientRequestId: Meta exatamente 1×", async () => {
    let claimed = false;
    let ledgerStatus: "PENDING" | "SENDING" | "META_ACCEPTED" | "COMPLETED" = "PENDING";
    let waMessageId: string | null = null;
    let releaseMeta: (() => void) | undefined;
    const metaGate = new Promise<void>((resolve) => {
      releaseMeta = resolve;
    });

    mocks.findSendRequest.mockImplementation(async () => ({
      ...pendingLedger,
      status: ledgerStatus,
      waMessageId,
    }));
    mocks.beginOrLoadSendRequest.mockImplementation(async () => ({
      ...pendingLedger,
      status: ledgerStatus === "SENDING" ? "PENDING" : ledgerStatus,
      waMessageId,
    }));
    mocks.claimSendForMeta.mockImplementation(async () => {
      if (claimed || (ledgerStatus !== "PENDING" && ledgerStatus !== "FAILED_PRE_META")) {
        return false;
      }
      claimed = true;
      ledgerStatus = "SENDING";
      return true;
    });
    mocks.adapterSendText.mockImplementation(async () => {
      await metaGate;
      return { messageId: "wamid.outbound-1" };
    });
    mocks.markSendMetaAccepted.mockImplementation(async (_id: string, id: string) => {
      waMessageId = id;
      ledgerStatus = "META_ACCEPTED";
    });
    mocks.markSendCompleted.mockImplementation(async (_id: string, id: string) => {
      waMessageId = id;
      ledgerStatus = "COMPLETED";
    });

    const started = Promise.all([post(), post()]);
    // Ambos entram no handler; o vencedor fica bloqueado na Meta até o perdedor concluir.
    await vi.waitFor(() => {
      expect(mocks.claimSendForMeta.mock.calls.length).toBeGreaterThanOrEqual(1);
    });
    // Permite ao segundo request observar SENDING / claim perdido antes do COMPLETED.
    await Promise.resolve();
    await Promise.resolve();
    releaseMeta!();

    const [a, b] = await started;
    const pair = [a.status, b.status].sort((x, y) => x - y);

    expect(mocks.adapterSendText).toHaveBeenCalledTimes(1);
    expect(pair).toEqual([200, 409]);
    expect(ledgerStatus).toBe("COMPLETED");
    const bodies = await Promise.all([a.json(), b.json()]);
    const ok = bodies.find((j) => j.success === true);
    const busy = bodies.find((j) => j.success === false);
    expect(ok?.data.waMessageId).toBe("wamid.outbound-1");
    expect(busy?.error.code).toBe("SEND_IN_PROGRESS");
  });

  it("META_ACCEPTED: retomada só reconcilia e não chama Meta", async () => {
    mocks.findSendRequest.mockResolvedValue({
      ...pendingLedger,
      status: "META_ACCEPTED",
      waMessageId: "wamid.already",
    });

    const response = await post();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.waMessageId).toBe("wamid.already");
    expect(mocks.adapterSendText).not.toHaveBeenCalled();
    expect(mocks.claimSendForMeta).not.toHaveBeenCalled();
    expect(mocks.waInboxCreateOutbound).toHaveBeenCalledTimes(1);
    expect(mocks.markSendCompleted).toHaveBeenCalledWith("ledger-1", "wamid.already");
  });

  it("SENDING abandonado: fail-closed 409 sem Meta (sem reclaim automático)", async () => {
    mocks.findSendRequest.mockResolvedValue({
      ...pendingLedger,
      status: "SENDING",
      waMessageId: null,
    });

    const response = await post();
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.error.code).toBe("SEND_IN_PROGRESS");
    expect(mocks.adapterSendText).not.toHaveBeenCalled();
    expect(mocks.claimSendForMeta).not.toHaveBeenCalled();
  });
});
