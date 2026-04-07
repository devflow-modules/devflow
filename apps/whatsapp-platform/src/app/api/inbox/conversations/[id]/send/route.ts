import { NextRequest, NextResponse } from "next/server";
import { WhatsAppCloudAdapter } from "@devflow/whatsapp-core";
import { getAuthFromRequest } from "@/modules/auth";
import { waInboxCreateOutbound } from "@/modules/inbox";
import { digitsOnly } from "@/modules/inbox/waInboxUtils";
import { prisma } from "@/lib/prisma";
import { resolveMessagingTenantForOutbound } from "@/modules/whatsapp/whatsappPhoneResolution";
import { z } from "zod";
import { enforceUsageOrThrow, UsageLimitExceededError } from "@/modules/billing/enforcementService";
import { trackUsage } from "@/modules/billing/usageService";
import { logAction } from "@/modules/inbox";
import { UsageEventType } from "@/generated/prisma-whatsapp";

const bodySchema = z.object({
  text: z.string().min(1).max(4096),
});

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
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
    return NextResponse.json({ error: "text inválido" }, { status: 400 });
  }

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

  try {
    await enforceUsageOrThrow({ tenantId: tenantRow.id, feature: "messages", quantity: 1 });
  } catch (e) {
    if (e instanceof UsageLimitExceededError) {
      return NextResponse.json(
        { success: false, error: { message: e.message, code: e.code } },
        { status: 402 }
      );
    }
    throw e;
  }

  const messagingTenant = await resolveMessagingTenantForOutbound(
    auth.payload.tenantId,
    thread.businessPhoneNumberId
  );
  if (!messagingTenant) {
    return NextResponse.json(
      {
        error:
          "WhatsApp não configurado: ligue um número em WhatsApp (dashboard) ou no onboarding.",
      },
      { status: 503 }
    );
  }

  const to = thread.phoneNumber.replace(/\D/g, "");
  if (to.length < 8) {
    return NextResponse.json({ error: "Número do contato inválido" }, { status: 400 });
  }

  try {
    const adapter = new WhatsAppCloudAdapter({ accessToken: messagingTenant.accessToken });
    const { messageId } = await adapter.sendText(messagingTenant.phoneNumberId, {
      to,
      text: parsed.data.text,
    });

    await waInboxCreateOutbound({
      tenantId: auth.payload.tenantId,
      businessPhoneNumberId: messagingTenant.phoneNumberId,
      customerPhoneDigits: thread.phoneNumber.replace(/\D/g, ""),
      waMessageId: messageId,
      text: parsed.data.text,
      businessDigits: digitsOnly(messagingTenant.displayPhoneNumber ?? ""),
    });

    await prisma.waInboxThread.update({
      where: { id: thread.id },
      data: {
        lastMessageAt: new Date(),
        lastMessagePreview:
          parsed.data.text.length > 200
            ? parsed.data.text.slice(0, 199) + "\u2026"
            : parsed.data.text,
      },
    });

    trackUsage(auth.payload.tenantId, UsageEventType.MESSAGE_SENT, {
      metadata: { source: "inbox_send", threadId: thread.id },
    });

    await logAction(
      auth.payload.tenantId,
      thread.id,
      auth.payload.sub,
      "message_send",
      { textLength: parsed.data.text.length }
    );

    return NextResponse.json({
      success: true,
      data: { messageId, waMessageId: messageId },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[inbox/send]", e);
    return NextResponse.json(
      { success: false, error: { message: msg } },
      { status: 502 }
    );
  }
}
