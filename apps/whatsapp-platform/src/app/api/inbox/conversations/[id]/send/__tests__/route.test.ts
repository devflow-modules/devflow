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

function request(body: unknown = { text: "Resposta do agente" }) {
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
  });

  it("retorna 401 sem autenticação e não acessa a conversa", async () => {
    mocks.getAuth.mockResolvedValue(null);

    const response = await post();

    expect(response.status).toBe(401);
    expect(mocks.findThread).not.toHaveBeenCalled();
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

  it("retorna 502 e não persiste quando a Meta rejeita o envio", async () => {
    mocks.adapterSendText.mockRejectedValue(new Error("Cloud indisponível"));

    const response = await post();
    const json = await response.json();

    expect(response.status).toBe(502);
    expect(json.error.message).toBe("Cloud indisponível");
    expect(mocks.waInboxCreateOutbound).not.toHaveBeenCalled();
    expect(mocks.updateThread).not.toHaveBeenCalled();
    expect(mocks.logAction).not.toHaveBeenCalled();
  });

  it("envia para conversa de outro owner no mesmo tenant e preserva efeitos observáveis", async () => {
    const response = await post();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({
      success: true,
      data: {
        messageId: "wamid.outbound-1",
        waMessageId: "wamid.outbound-1",
      },
    });
    expect(mocks.findThread).toHaveBeenCalledWith({
      where: { id: "thread-1", tenantId: "tenant-1" },
    });
    expect(mocks.findWhatsappLine).toHaveBeenCalledWith({
      where: {
        tenantId: "tenant-1",
        phoneNumberId: "phone-id-1",
      },
    });
    expect(mocks.adapterSendText).toHaveBeenCalledTimes(1);
    expect(mocks.adapterSendText).toHaveBeenCalledWith("phone-id-1", {
      to: "5511999990000",
      text: "Resposta do agente",
    });
    expect(mocks.waInboxCreateOutbound).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      businessPhoneNumberId: "phone-id-1",
      customerPhoneDigits: "5511999990000",
      waMessageId: "wamid.outbound-1",
      text: "Resposta do agente",
      businessDigits: "551133334444",
    });
    expect(mocks.updateThread).toHaveBeenCalledWith({
      where: { id: "thread-1" },
      data: {
        lastMessageAt: expect.any(Date),
        lastMessagePreview: "Resposta do agente",
      },
    });
    expect(mocks.trackUsage).toHaveBeenCalledWith(
      "tenant-1",
      expect.anything(),
      {
        metadata: { source: "inbox_send", threadId: "thread-1" },
      }
    );
    expect(mocks.logAction).toHaveBeenCalledWith(
      "tenant-1",
      "thread-1",
      "operator-1",
      "message_send",
      { textLength: 18 }
    );
  });
});
