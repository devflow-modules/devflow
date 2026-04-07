import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma-whatsapp";

export type PlatformAuditInput = {
  action: string;
  tenantId?: string | null;
  userId?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
};

/**
 * Escrita assíncrona; falhas de auditoria não quebram o fluxo principal.
 */
export function recordPlatformAudit(input: PlatformAuditInput): void {
  void prisma.auditLog
    .create({
      data: {
        action: input.action,
        tenantId: input.tenantId ?? undefined,
        userId: input.userId ?? undefined,
        resourceType: input.resourceType ?? undefined,
        resourceId: input.resourceId ?? undefined,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
        ip: input.ip ?? undefined,
      },
    })
    .catch((err) => {
      console.error("[audit] falha ao gravar platform_audit_logs", err instanceof Error ? err.message : err);
    });
}
