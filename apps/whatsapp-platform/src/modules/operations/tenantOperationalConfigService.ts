import { prisma } from "@/lib/prisma";

export type TenantOperationalConfigRow = {
  id: string;
  tenantId: string;
  aiEnabled: boolean;
  automationEnabled: boolean;
  updatedAt: Date;
  updatedByUserId: string | null;
};

export async function getTenantOperationalConfig(
  tenantId: string
): Promise<TenantOperationalConfigRow | null> {
  return prisma.tenantOperationalConfig.findUnique({ where: { tenantId } });
}

export async function getOrCreateTenantOperationalConfig(
  tenantId: string
): Promise<TenantOperationalConfigRow> {
  const existing = await prisma.tenantOperationalConfig.findUnique({ where: { tenantId } });
  if (existing) return existing;
  return prisma.tenantOperationalConfig.create({
    data: { tenantId },
  });
}

export type OperationalPatch = Partial<Pick<TenantOperationalConfigRow, "aiEnabled" | "automationEnabled">>;

export async function updateTenantOperationalConfig(
  tenantId: string,
  patch: OperationalPatch,
  updatedByUserId?: string | null
): Promise<TenantOperationalConfigRow> {
  await getOrCreateTenantOperationalConfig(tenantId);
  return prisma.tenantOperationalConfig.update({
    where: { tenantId },
    data: {
      ...(patch.aiEnabled !== undefined ? { aiEnabled: patch.aiEnabled } : {}),
      ...(patch.automationEnabled !== undefined ? { automationEnabled: patch.automationEnabled } : {}),
      ...(updatedByUserId !== undefined ? { updatedByUserId } : {}),
    },
  });
}

/** IA automática (LLM) permitida ao nível operacional. */
export async function isOperationalAiEnabled(tenantId: string): Promise<boolean> {
  const row = await getOrCreateTenantOperationalConfig(tenantId);
  return row.aiEnabled;
}

/** Automação (comercial, legado inbound, etc.) permitida. */
export async function isOperationalAutomationEnabled(tenantId: string): Promise<boolean> {
  const row = await getOrCreateTenantOperationalConfig(tenantId);
  return row.automationEnabled;
}
