/**
 * Status da conversa (OPEN, PENDING, CLOSED).
 * Regras: inbound → OPEN; outbound pode manter ou PENDING conforme política.
 */

import { WaInboxThreadStatus } from "@/generated/prisma-whatsapp";
import { prisma } from "@/lib/prisma";

export async function updateThreadStatus(
  tenantId: string,
  threadId: string,
  status: WaInboxThreadStatus
): Promise<boolean> {
  const updated = await prisma.waInboxThread.updateMany({
    where: { id: threadId, tenantId },
    data: { status },
  });
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
