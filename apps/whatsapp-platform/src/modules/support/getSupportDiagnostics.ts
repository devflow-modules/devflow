import { prisma } from "@/lib/prisma";
import { WhatsappPhoneNumberStatus } from "@/generated/prisma-whatsapp";
import type { SupportDiagnostics } from "./supportTypes";

/** Janela para contagem de mensagens recentes (relatórios de suporte). */
export const SUPPORT_RECENT_MESSAGES_DAYS = 7;

/**
 * Estado do tenant + contagens Inbox para relatórios de suporte (sem dados sensíveis).
 */
export async function getSupportDiagnostics(tenantId: string): Promise<SupportDiagnostics> {
  const since = new Date();
  since.setDate(since.getDate() - SUPPORT_RECENT_MESSAGES_DAYS);

  const [tenant, activeLines, threadCount, recentMessagesCount] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        systemPrompt: true,
        defaultPrompt: true,
        apiKey: true,
      },
    }),
    prisma.whatsappPhoneNumber.findMany({
      where: { tenantId, status: WhatsappPhoneNumberStatus.ACTIVE },
      select: { phoneNumberId: true, displayPhoneNumber: true, status: true },
      orderBy: [{ isPrimary: "desc" }, { updatedAt: "desc" }],
      take: 1,
    }),
    prisma.waInboxThread.count({ where: { tenantId } }),
    prisma.waInboxMessage.count({
      where: { tenantId, ts: { gte: since } },
    }),
  ]);

  const wpn = activeLines[0] ?? null;
  const phoneConnected = Boolean(wpn);
  const promptReady = Boolean((tenant?.systemPrompt || tenant?.defaultPrompt || "").trim());
  const apiKeyReady = Boolean(tenant?.apiKey);

  return {
    activationComplete: phoneConnected && promptReady,
    phoneConnected,
    promptReady,
    apiKeyReady,
    phoneNumberId: wpn?.phoneNumberId ?? null,
    displayPhoneNumber: wpn?.displayPhoneNumber?.trim() || null,
    lineStatus: wpn?.status ?? null,
    threadCount,
    recentMessagesCount,
  };
}
