import { NextRequest, NextResponse } from "next/server";
import { WhatsAppCloudAdapter } from "@devflow/whatsapp-core";
import { getAuthFromRequest } from "@/modules/auth";
import { waInboxCreateOutbound, logAction } from "@/modules/inbox";
import { digitsOnly } from "@/modules/inbox/waInboxUtils";
import {
  SEND_ERROR_CODES,
  beginOrLoadSendRequest,
  claimSendForMeta,
  findSendRequest,
  markSendCompleted,
  markSendFailedPreMeta,
  markSendMetaAccepted,
  markSendPersistFailed,
  type OutboundSendLedgerRow,
} from "@/modules/inbox/outboundSendRequestService";
import {
  evaluateSendAuthorship,
  shouldEnforceSendAuthorship,
} from "@/modules/inbox/sendAuthorshipGate";
import { prisma } from "@/lib/prisma";
import { resolveMessagingTenantForOutbound } from "@/modules/whatsapp/whatsappPhoneResolution";
import { assertWhatsappPhoneNumberSendable } from "@/modules/whatsapp/whatsappChannelGuards";
import { z } from "zod";
import {
  enforceUsageOrThrow,
  UsageLimitExceededError,
  usageLimitErrorToPayload,
} from "@/modules/billing/enforcementService";
import { sanitizeUsageLimitErrorPayload } from "@/modules/billing/billingSanitizer";
import { trackUsage } from "@/modules/billing/usageService";
import { UsageEventType } from "@/generated/prisma-whatsapp";
import { logEvent, logError } from "@/lib/observability";

const bodySchema = z.object({
  text: z.string().min(1).max(4096),
  clientRequestId: z.string().trim().min(8).max(128),
});

export const dynamic = "force-dynamic";

function successPayload(waMessageId: string, clientRequestId: string, replayed: boolean) {
  return {
    success: true as const,
    data: {
      messageId: waMessageId,
      waMessageId,
      clientRequestId,
      status: "sent" as const,
      replayed,
    },
  };
}

function inProgressResponse(clientRequestId: string) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: SEND_ERROR_CODES.IN_PROGRESS,
        message: "Envio já em curso para esta tentativa. Aguarde.",
        clientRequestId,
        retryableMeta: false,
      },
    },
    { status: 409 }
  );
}

function unknownResponse(clientRequestId: string) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: SEND_ERROR_CODES.STATUS_UNKNOWN,
        message: "Estado do envio indeterminado. Não reenvie automaticamente.",
        clientRequestId,
        retryableMeta: false,
      },
    },
    { status: 409 }
  );
}

async function persistAfterMeta(params: {
  tenantId: string;
  threadId: string;
  userId: string;
  text: string;
  waMessageId: string;
  phoneNumberId: string;
  customerPhoneDigits: string;
  businessDigits: string;
  ledgerId: string;
  clientRequestId: string;
}): Promise<NextResponse> {
  try {
    await waInboxCreateOutbound({
      tenantId: params.tenantId,
      businessPhoneNumberId: params.phoneNumberId,
      customerPhoneDigits: params.customerPhoneDigits,
      waMessageId: params.waMessageId,
      text: params.text,
      businessDigits: params.businessDigits,
    });

    await prisma.waInboxThread.update({
      where: { id: params.threadId },
      data: {
        lastMessageAt: new Date(),
        lastMessagePreview:
          params.text.length > 200 ? params.text.slice(0, 199) + "\u2026" : params.text,
      },
    });

    trackUsage(params.tenantId, UsageEventType.MESSAGE_SENT, {
      metadata: {
        source: "inbox_send",
        threadId: params.threadId,
        clientRequestId: params.clientRequestId,
      },
    });

    await logAction(params.tenantId, params.threadId, params.userId, "message_send", {
      textLength: params.text.length,
      clientRequestId: params.clientRequestId,
    });

    await markSendCompleted(params.ledgerId, params.waMessageId);

    logEvent("info", "inbox", "conversation_message_sent", {
      tenantId: params.tenantId,
      threadId: params.threadId,
      userId: params.userId,
      clientRequestId: params.clientRequestId,
    });

    return NextResponse.json(successPayload(params.waMessageId, params.clientRequestId, false));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await markSendPersistFailed(params.ledgerId, msg);
    logError("inbox", e, {
      route: "inbox_conversation_send",
      threadId: params.threadId,
      phase: "persist_after_meta",
      clientRequestId: params.clientRequestId,
    });
    return NextResponse.json(
      {
        success: false,
        error: {
          code: SEND_ERROR_CODES.ALREADY_DELIVERED_TO_META,
          message:
            "A Meta aceitou a mensagem, mas a sincronização local falhou. Não reenvie: use Tentar sincronizar.",
          waMessageId: params.waMessageId,
          clientRequestId: params.clientRequestId,
          retryableMeta: false,
          reconcileOnly: true,
        },
      },
      { status: 502 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    logEvent("warn", "auth", "unauthorized", { route: "inbox_conversation_send" });
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id: threadId } = await context.params;
  if (!threadId?.trim()) {
    return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "text e clientRequestId obrigatórios" },
      { status: 400 }
    );
  }

  const { text, clientRequestId } = parsed.data;

  const thread = await prisma.waInboxThread.findFirst({
    where: { id: threadId, tenantId: auth.payload.tenantId },
  });
  if (!thread) {
    return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  }

  const tenantRow = await prisma.tenant.findUnique({
    where: { id: auth.payload.tenantId },
    select: { id: true },
  });
  if (!tenantRow) {
    return NextResponse.json({ error: "Tenant não encontrado" }, { status: 404 });
  }

  let ledger: OutboundSendLedgerRow | null = await findSendRequest(
    auth.payload.tenantId,
    clientRequestId
  );

  if (ledger) {
    if (ledger.threadId !== threadId) {
      return NextResponse.json(
        { error: "clientRequestId já usado noutra conversa" },
        { status: 409 }
      );
    }
    if (ledger.text !== text) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: SEND_ERROR_CODES.TEXT_MISMATCH,
            message: "O texto não corresponde ao clientRequestId desta tentativa.",
            clientRequestId,
            retryableMeta: false,
          },
        },
        { status: 409 }
      );
    }
    if (ledger.status === "COMPLETED" && ledger.waMessageId) {
      return NextResponse.json(successPayload(ledger.waMessageId, clientRequestId, true));
    }
    if (ledger.status === "SENDING") {
      return inProgressResponse(clientRequestId);
    }
  }

  if (shouldEnforceSendAuthorship(ledger?.status)) {
    const authorship = evaluateSendAuthorship({
      status: thread.status,
      assignedToUserId: thread.assignedToUserId,
      callerUserId: auth.payload.sub,
    });
    if (!authorship.ok) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: authorship.code,
            message: authorship.message,
            clientRequestId,
            retryableMeta: false,
          },
        },
        { status: 409 }
      );
    }
  }

  try {
    await enforceUsageOrThrow({ tenantId: tenantRow.id, feature: "messages", quantity: 1 });
  } catch (e) {
    if (e instanceof UsageLimitExceededError) {
      const err = sanitizeUsageLimitErrorPayload(usageLimitErrorToPayload(e), auth.payload);
      return NextResponse.json({ success: false, error: err }, { status: 402 });
    }
    throw e;
  }

  const lineRow = await prisma.whatsappPhoneNumber.findFirst({
    where: {
      tenantId: auth.payload.tenantId,
      phoneNumberId: thread.businessPhoneNumberId,
    },
  });
  try {
    assertWhatsappPhoneNumberSendable(lineRow);
  } catch (e) {
    const code = e instanceof Error ? e.message : "CHANNEL_NOT_ACTIVE";
    if (code === "CHANNEL_NOT_ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CHANNEL_NOT_ACTIVE",
            message:
              "Canal em ativação. O envio fica disponível após aprovação da Meta e configuração do token.",
          },
        },
        { status: 403 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "CHANNEL_NOT_CONFIGURED",
          message:
            "WhatsApp não configurado: ligue um número em WhatsApp (dashboard) ou no onboarding.",
        },
      },
      { status: 503 }
    );
  }

  const messagingTenant = await resolveMessagingTenantForOutbound(
    auth.payload.tenantId,
    thread.businessPhoneNumberId
  );
  if (!messagingTenant) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "CHANNEL_NOT_CONFIGURED",
          message:
            "WhatsApp não configurado: ligue um número em WhatsApp (dashboard) ou no onboarding.",
        },
      },
      { status: 503 }
    );
  }

  const to = thread.phoneNumber.replace(/\D/g, "");
  if (to.length < 8) {
    return NextResponse.json({ error: "Número do contato inválido" }, { status: 400 });
  }

  const persistParamsBase = {
    tenantId: auth.payload.tenantId,
    threadId: thread.id,
    userId: auth.payload.sub,
    text,
    phoneNumberId: messagingTenant.phoneNumberId,
    customerPhoneDigits: thread.phoneNumber.replace(/\D/g, ""),
    businessDigits: digitsOnly(messagingTenant.displayPhoneNumber ?? ""),
    clientRequestId,
  };

  if (ledger?.status === "META_ACCEPTED" && ledger.waMessageId) {
    return persistAfterMeta({
      ...persistParamsBase,
      waMessageId: ledger.waMessageId,
      ledgerId: ledger.id,
    });
  }

  if (!ledger) {
    ledger = await beginOrLoadSendRequest({
      tenantId: auth.payload.tenantId,
      threadId: thread.id,
      userId: auth.payload.sub,
      clientRequestId,
      text,
    });
  }

  // Re-check after create race
  if (ledger.status === "COMPLETED" && ledger.waMessageId) {
    return NextResponse.json(successPayload(ledger.waMessageId, clientRequestId, true));
  }
  if (ledger.status === "META_ACCEPTED" && ledger.waMessageId) {
    return persistAfterMeta({
      ...persistParamsBase,
      waMessageId: ledger.waMessageId,
      ledgerId: ledger.id,
    });
  }
  if (ledger.status === "SENDING") {
    return inProgressResponse(clientRequestId);
  }
  if (ledger.status !== "PENDING" && ledger.status !== "FAILED_PRE_META") {
    return unknownResponse(clientRequestId);
  }

  const claimed = await claimSendForMeta(ledger.id);
  if (!claimed) {
    const latest = await findSendRequest(auth.payload.tenantId, clientRequestId);
    if (latest?.status === "COMPLETED" && latest.waMessageId) {
      return NextResponse.json(successPayload(latest.waMessageId, clientRequestId, true));
    }
    if (latest?.status === "META_ACCEPTED" && latest.waMessageId) {
      return persistAfterMeta({
        ...persistParamsBase,
        waMessageId: latest.waMessageId,
        ledgerId: latest.id,
      });
    }
    return inProgressResponse(clientRequestId);
  }

  let waMessageId: string;
  try {
    const adapter = new WhatsAppCloudAdapter({ accessToken: messagingTenant.accessToken! });
    const sent = await adapter.sendText(messagingTenant.phoneNumberId, {
      to,
      text,
    });
    waMessageId = sent.messageId;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await markSendFailedPreMeta(ledger.id, msg);
    logError("inbox", e, {
      route: "inbox_conversation_send",
      threadId: thread.id,
      phase: "meta_send",
      clientRequestId,
    });
    return NextResponse.json(
      {
        success: false,
        error: {
          code: SEND_ERROR_CODES.FAILED_PRE_META,
          message: msg,
          clientRequestId,
          retryableMeta: true,
        },
      },
      { status: 502 }
    );
  }

  await markSendMetaAccepted(ledger.id, waMessageId);

  return persistAfterMeta({
    ...persistParamsBase,
    waMessageId,
    ledgerId: ledger.id,
  });
}
