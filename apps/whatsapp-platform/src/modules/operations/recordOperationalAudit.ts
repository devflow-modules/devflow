import { recordPlatformAudit } from "@/lib/platformAuditLog";

export function auditOperationalAction(
  action: string,
  tenantId: string,
  userId: string | null,
  metadata?: Record<string, unknown>
): void {
  recordPlatformAudit({
    action,
    tenantId,
    userId,
    resourceType: "tenant_operational",
    metadata: metadata ?? {},
  });
}
