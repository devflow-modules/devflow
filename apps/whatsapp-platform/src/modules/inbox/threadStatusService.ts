/**
 * Status da conversa (OPEN, PENDING, CLOSED).
 * Regras: inbound → OPEN; outbound pode manter ou PENDING conforme política.
 * Transições redundantes (mesmo status) são no-op sem side effects.
 */

import { WaInboxThreadStatus } from "@/generated/prisma-whatsapp";
import { prisma } from "@/lib/prisma";
import { bumpMetric } from "@/lib/observability";

export async function updateThreadStatus(
  tenantId: string,
  threadId: string,
  status: WaInboxThreadStatus,
  callerUserId?: string
): Promise<boolean> {
  const existing = await prisma.waInboxThread.findFirst({
    where: { id: threadId, tenantId },
    select: { status: true },
  });
  if (!existing) return false;

  const previousStatus = existing.status;
  if (previousStatus === status) {
    return true;
  }

  const updated = await prisma.waInboxThread.updateMany({
    where: { id: threadId, tenantId },
    data: { status },
  });
  if (updated.count === 0) return false;

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

  return true;
}

/**
 * Chamado ao persistir mensagem: inbound → OPEN (reabre CLOSED/PENDING).
 * Delega a `updateThreadStatus` para partilhar idempotência, audit e realtime.
 * No-op se a thread já estiver OPEN (sem side effects redundantes).
 */
export async function autoUpdateStatusOnNewMessage(
  tenantId: string,
  threadId: string,
  direction: "INBOUND" | "OUTBOUND"
): Promise<void> {
  if (direction === "INBOUND") {
    await updateThreadStatus(tenantId, threadId, WaInboxThreadStatus.OPEN, "system");
  }
  // outbound: opcionalmente PENDING; não alteramos para não fechar fluxo
}
