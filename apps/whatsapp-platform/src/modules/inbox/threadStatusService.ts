/**
 * Status da conversa (OPEN, PENDING, CLOSED).
 * Regras: inbound → OPEN; outbound pode manter ou PENDING conforme política.
 * Transições redundantes (mesmo status) são no-op sem side effects.
 * Atualização usa compare-and-set (status atual esperado) com retry limitado.
 */

import { WaInboxThreadStatus } from "@/generated/prisma-whatsapp";
import { prisma } from "@/lib/prisma";
import { bumpMetric } from "@/lib/observability";

/** Tentativas de leitura + CAS (inclui o primeiro passe). */
const STATUS_CAS_ATTEMPTS = 2;

export type UpdateThreadStatusResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "conflict" };

async function applyStatusSideEffects(
  tenantId: string,
  threadId: string,
  previousStatus: WaInboxThreadStatus,
  status: WaInboxThreadStatus,
  callerUserId?: string
): Promise<void> {
  if (status === WaInboxThreadStatus.CLOSED) bumpMetric("threads_closed");
  if (status === WaInboxThreadStatus.OPEN) bumpMetric("threads_opened");

  const { publishInboxEvent, eventConversationStatusChanged } = await import(
    "@/modules/realtime/realtime.service"
  );
  publishInboxEvent(tenantId, eventConversationStatusChanged(tenantId, { threadId, status }));

  const { logAction } = await import("./auditService");
  await logAction(tenantId, threadId, callerUserId ?? "system", "status_change", {
    previousStatus,
    status,
  });

  const { dispatchStatusChanged } = await import("@/modules/automation");
  dispatchStatusChanged(tenantId, threadId, status).catch((e) =>
    console.error("[thread-status] automation dispatch", e)
  );
}

export async function updateThreadStatus(
  tenantId: string,
  threadId: string,
  status: WaInboxThreadStatus,
  callerUserId?: string
): Promise<UpdateThreadStatusResult> {
  for (let attempt = 0; attempt < STATUS_CAS_ATTEMPTS; attempt++) {
    const existing = await prisma.waInboxThread.findFirst({
      where: { id: threadId, tenantId },
      select: { status: true },
    });
    if (!existing) return { ok: false, reason: "not_found" };

    const previousStatus = existing.status;
    if (previousStatus === status) {
      return { ok: true };
    }

    const updated = await prisma.waInboxThread.updateMany({
      where: { id: threadId, tenantId, status: previousStatus },
      data: { status },
    });

    if (updated.count > 0) {
      await applyStatusSideEffects(tenantId, threadId, previousStatus, status, callerUserId);
      return { ok: true };
    }
    // count === 0: outro writer alterou o status — reler e tentar de novo
  }

  const final = await prisma.waInboxThread.findFirst({
    where: { id: threadId, tenantId },
    select: { status: true },
  });
  if (!final) return { ok: false, reason: "not_found" };
  if (final.status === status) return { ok: true };
  return { ok: false, reason: "conflict" };
}

/**
 * Chamado ao persistir mensagem: inbound → OPEN (reabre CLOSED/PENDING).
 * Delega a `updateThreadStatus` para partilhar idempotência, audit e realtime.
 * No-op se a thread já estiver OPEN (sem side effects redundantes).
 * Não lança em conflito/`not_found` — o caller deve observar o resultado.
 * Retorna `null` para OUTBOUND (sem transição).
 */
export async function autoUpdateStatusOnNewMessage(
  tenantId: string,
  threadId: string,
  direction: "INBOUND" | "OUTBOUND"
): Promise<UpdateThreadStatusResult | null> {
  if (direction === "INBOUND") {
    return updateThreadStatus(tenantId, threadId, WaInboxThreadStatus.OPEN, "system");
  }
  // outbound: opcionalmente PENDING; não alteramos para não fechar fluxo
  return null;
}
