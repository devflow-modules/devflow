/**
 * Status da conversa (OPEN, PENDING, CLOSED).
 * Regras: inbound → OPEN; outbound pode manter ou PENDING conforme política.
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
  const updated = await prisma.waInboxThread.updateMany({
    where: { id: threadId, tenantId },
    data: { status },
  });
  if (updated.count > 0) {
    if (status === WaInboxThreadStatus.CLOSED) bumpMetric("threads_closed");
    if (status === WaInboxThreadStatus.OPEN) bumpMetric("threads_opened");
    const { publishInboxEvent, eventConversationStatusChanged } = await import("@/modules/realtime/realtime.service");
    publishInboxEvent(tenantId, eventConversationStatusChanged(tenantId, { threadId, status }));
    const { logAction } = await import("./auditService");
    await logAction(tenantId, threadId, callerUserId ?? "system", "status_change", { status });
    const { dispatchStatusChanged } = await import("@/modules/automation");
    dispatchStatusChanged(tenantId, threadId, status).catch((e) =>
      console.error("[thread-status] automation dispatch", e)
    );
  }
  return updated.count > 0;
}

/**
 * Chamado ao persistir mensagem: inbound → OPEN; outbound → PENDING (aguardando cliente).
 */
export async function autoUpdateStatusOnNewMessage(
  tenantId: string,
  threadId: string,
  direction: "INBOUND" | "OUTBOUND"
): Promise<void> {
  if (direction === "INBOUND") {
    await prisma.waInboxThread.updateMany({
      where: { id: threadId, tenantId },
      data: { status: WaInboxThreadStatus.OPEN },
    });
  }
  // outbound: opcionalmente PENDING; não alteramos para não fechar fluxo
}
