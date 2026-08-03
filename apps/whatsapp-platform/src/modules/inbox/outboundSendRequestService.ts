/**
 * Ledger de envio humano (clientRequestId) — garante no máximo um sendText Meta
 * por tentativa lógica, mesmo quando a persistência falha após a Meta aceitar.
 */
import { prisma } from "@/lib/prisma";
import type { WaInboxSendRequest } from "@/generated/prisma-whatsapp";

export type OutboundSendLedgerRow = WaInboxSendRequest;

export const SEND_ERROR_CODES = {
  IN_PROGRESS: "SEND_IN_PROGRESS",
  FAILED_PRE_META: "SEND_FAILED_PRE_META",
  /** Meta já aceitou; não chamar sendText de novo. Retry só reconcilia persistência. */
  ALREADY_DELIVERED_TO_META: "SEND_ALREADY_DELIVERED_TO_META",
  STATUS_UNKNOWN: "SEND_STATUS_UNKNOWN",
  TEXT_MISMATCH: "SEND_TEXT_MISMATCH",
} as const;

export async function findSendRequest(
  tenantId: string,
  clientRequestId: string
): Promise<OutboundSendLedgerRow | null> {
  return prisma.waInboxSendRequest.findUnique({
    where: {
      tenantId_clientRequestId: { tenantId, clientRequestId },
    },
  });
}

/** Cria PENDING ou devolve a linha existente (corrida de create). */
export async function beginOrLoadSendRequest(params: {
  tenantId: string;
  threadId: string;
  userId: string;
  clientRequestId: string;
  text: string;
}): Promise<OutboundSendLedgerRow> {
  try {
    return await prisma.waInboxSendRequest.create({
      data: {
        tenantId: params.tenantId,
        threadId: params.threadId,
        userId: params.userId,
        clientRequestId: params.clientRequestId,
        text: params.text,
        status: "PENDING",
      },
    });
  } catch {
    const existing = await findSendRequest(params.tenantId, params.clientRequestId);
    if (!existing) throw new Error("SEND_LEDGER_CREATE_FAILED");
    return existing;
  }
}

/**
 * Claim exclusivo para chamar a Meta: PENDING|FAILED_PRE_META → SENDING.
 * Apenas um caller obtém true.
 */
export async function claimSendForMeta(id: string): Promise<boolean> {
  const updated = await prisma.waInboxSendRequest.updateMany({
    where: {
      id,
      status: { in: ["PENDING", "FAILED_PRE_META"] },
      waMessageId: null,
    },
    data: { status: "SENDING", lastError: null },
  });
  return updated.count === 1;
}

export async function markSendFailedPreMeta(id: string, lastError: string): Promise<void> {
  await prisma.waInboxSendRequest.update({
    where: { id },
    data: {
      status: "FAILED_PRE_META",
      lastError: lastError.slice(0, 2000),
      waMessageId: null,
    },
  });
}

export async function markSendMetaAccepted(id: string, waMessageId: string): Promise<void> {
  await prisma.waInboxSendRequest.update({
    where: { id },
    data: {
      status: "META_ACCEPTED",
      waMessageId,
      lastError: null,
    },
  });
}

export async function markSendCompleted(id: string, waMessageId: string): Promise<void> {
  await prisma.waInboxSendRequest.update({
    where: { id },
    data: {
      status: "COMPLETED",
      waMessageId,
      lastError: null,
    },
  });
}

export async function markSendPersistFailed(id: string, lastError: string): Promise<void> {
  await prisma.waInboxSendRequest.update({
    where: { id },
    data: {
      status: "META_ACCEPTED",
      lastError: lastError.slice(0, 2000),
    },
  });
}
