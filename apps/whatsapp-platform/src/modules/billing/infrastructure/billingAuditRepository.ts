/**
 * Repositório de audit logs do billing.
 * Idempotência: referenceId + eventType evita duplicatas quando fornecidos.
 */

import { Prisma } from "@/generated/prisma-whatsapp";
import { prisma } from "@/lib/prisma";

export type BillingAuditSource = "stripe" | "usage" | "system";

export type CreateAuditLogInput = {
  tenantId: string;
  eventType: string;
  source: BillingAuditSource;
  referenceId?: string | null;
  metadata?: Record<string, unknown> | null;
};

/**
 * Cria audit log. Se referenceId + eventType já existir, não duplica (idempotência).
 */
export async function createBillingAuditLog(input: CreateAuditLogInput): Promise<void> {
  if (input.referenceId) {
    const existing = await prisma.billingAuditLog.findFirst({
      where: {
        referenceId: input.referenceId,
        eventType: input.eventType,
      },
    });
    if (existing) return;
  }

  try {
    await prisma.billingAuditLog.create({
      data: {
        tenantId: input.tenantId,
        eventType: input.eventType,
        source: input.source,
        referenceId: input.referenceId ?? null,
        metadata:
          input.metadata != null
            ? (input.metadata as Prisma.InputJsonValue)
            : Prisma.DbNull,
      },
    });
  } catch (err) {
    if (isUniqueViolation(err)) return;
    throw err;
  }
}

function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof Error &&
    "code" in err &&
    (err as { code?: string }).code === "P2002"
  );
}

/**
 * Fire-and-forget: não bloqueia o fluxo principal.
 */
export function createBillingAuditLogAsync(input: CreateAuditLogInput): void {
  void createBillingAuditLog(input).catch((err) => {
    console.error("[BILLING][AUDIT] Failed to persist audit log", input.eventType, err);
  });
}
