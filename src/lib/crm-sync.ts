import type { Lead } from "@prisma/client";
import { prisma } from "@/lib/prisma-root";
import { getWhatsappCrmPrisma } from "@/lib/whatsapp-crm-db";

/** Thread mínima para criar lead outbound a partir da conversa WhatsApp Platform. */
export type ConversationLikeForOutboundLead = {
  id: string;
  tenantId: string;
  phoneNumber: string;
  contactName?: string | null;
};

/** Atualiza só o lado WhatsApp (ex.: após `PATCH` manual a `conversationRef` no portal). */
export async function mirrorOutboundLeadIdToThread(threadId: string, leadId: string | null): Promise<void> {
  await setThreadOutboundLeadId(threadId, leadId);
}

async function setThreadOutboundLeadId(threadId: string, leadId: string | null): Promise<void> {
  try {
    const wa = getWhatsappCrmPrisma();
    await wa.waInboxThread.update({
      where: { id: threadId },
      data: { outboundLeadId: leadId },
    });
  } catch (err) {
    console.warn(
      "[crm-sync] falha ao gravar outboundLeadId na thread (BD WhatsApp indisponível ou thread inexistente?)",
      threadId,
      err instanceof Error ? err.message : err
    );
  }
}

/**
 * Liga um lead do portal à thread canónica do inbox (`conversationRef` = `wa_inbox_threads.id`)
 * e espelha `Lead.id` em `WaInboxThread.outboundLeadId` quando a BD WhatsApp está acessível.
 */
export async function linkLeadToThread(leadId: string, threadId: string): Promise<Lead> {
  const lead = await prisma.lead.update({
    where: { id: leadId },
    data: { conversationRef: threadId },
  });
  await mirrorOutboundLeadIdToThread(threadId, leadId);
  return lead;
}

/**
 * Cria lead outbound interno espelhando uma conversa existente (ex.: inbound sem registo prévio no portal).
 * `origin` canónico: `inbound_whatsapp_thread` (ver `outbound-lead-origins.ts`).
 * Grava `outboundLeadId` na thread quando possível.
 */
export async function createLeadFromConversation(
  thread: ConversationLikeForOutboundLead
): Promise<Lead> {
  const lead = await prisma.lead.create({
    data: {
      phone: thread.phoneNumber.trim(),
      name: thread.contactName?.trim() || null,
      status: "novo",
      origin: "inbound_whatsapp_thread",
      conversationRef: thread.id,
    },
  });
  await mirrorOutboundLeadIdToThread(thread.id, lead.id);
  return lead;
}

export type NotifyExternalCrmInput = {
  webhookUrl: string;
  /** Corpo JSON (ex.: payload derivado de `buildExternalCrmLeadEventPayload` no serviço webhook). */
  body: Record<string, unknown>;
};

/**
 * Notifica CRM externo configurado pelo tenant. Não grava nem altera estado interno DevFlow.
 */
export async function notifyExternalCrm(input: NotifyExternalCrmInput): Promise<
  { ok: true; status: number } | { ok: false; error: string }
> {
  const url = input.webhookUrl.trim();
  if (!url) return { ok: false, error: "webhookUrl vazio" };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input.body),
    });
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }
    return { ok: true, status: res.status };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
