import { prisma } from "@/lib/prisma";
import { waInboxTenantExists } from "./waInboxMessageService";

export async function getWaInboxHealthForTenant(tenantId: string): Promise<{
  tenantResolutionOk: boolean;
  persistenceOk: boolean;
  messagesStored: number;
  lastMessageStoredAt: string | null;
  blockedReason: string;
}> {
  const tenantResolutionOk = await waInboxTenantExists(tenantId);
  if (!tenantResolutionOk) {
    return {
      tenantResolutionOk: false,
      persistenceOk: false,
      messagesStored: 0,
      lastMessageStoredAt: null,
      blockedReason: tenantId === "env" ? "VIRTUAL_TENANT_NO_PRISMA" : "TENANT_NOT_IN_PRISMA",
    };
  }

  try {
    const count = await prisma.waInboxMessage.count({ where: { tenantId } });
    const last = await prisma.waInboxMessage.findFirst({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    return {
      tenantResolutionOk: true,
      persistenceOk: true,
      messagesStored: count,
      lastMessageStoredAt: last?.createdAt.toISOString() ?? null,
      blockedReason: "NONE",
    };
  } catch {
    return {
      tenantResolutionOk: true,
      persistenceOk: false,
      messagesStored: 0,
      lastMessageStoredAt: null,
      blockedReason: "DB_ERROR",
    };
  }
}
