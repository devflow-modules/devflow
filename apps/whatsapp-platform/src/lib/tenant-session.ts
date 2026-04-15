import { cookies } from "next/headers";
import { JWT_COOKIE_NAME } from "@/lib/auth-config";
import { validateAuthToken } from "@/modules/auth/verifyToken";
import { prisma } from "@/lib/prisma";
import { WhatsappPhoneNumberStatus } from "@/generated/prisma-whatsapp";

export type TenantSnapshot =
  | { authenticated: false }
  | {
      authenticated: true;
      tenantId: string;
      tenantName: string | null;
      phoneConnected: boolean;
      promptReady: boolean;
      /** Integrações / developer — não bloqueia ativação. */
      apiKeyReady: boolean;
      /** Ativação operacional: linha WhatsApp + instruções do assistente. */
      activationComplete: boolean;
      /** Linha Business preferida (principal ou mais recente) — pós-onboarding / primeiro teste. */
      primaryBusinessDisplayNumber: string | null;
      primaryBusinessPhoneNumberId: string | null;
      primaryLineStatus: WhatsappPhoneNumberStatus | null;
    };

/**
 * Estado mínimo do tenant para onboarding / dashboard (RSC).
 */
export async function getTenantSnapshot(): Promise<TenantSnapshot> {
  try {
    const store = await cookies();
    const token = store.get(JWT_COOKIE_NAME)?.value;
    if (!token) return { authenticated: false };
    const auth = await validateAuthToken(token);
    if (!auth) return { authenticated: false };
    const payload = auth.payload;

    const [tenant, activeLines] = await Promise.all([
      prisma.tenant.findUnique({
        where: { id: payload.tenantId },
        select: {
          name: true,
          systemPrompt: true,
          defaultPrompt: true,
          apiKey: true,
        },
      }),
      prisma.whatsappPhoneNumber.findMany({
        where: {
          tenantId: payload.tenantId,
          status: {
            in: [WhatsappPhoneNumberStatus.ACTIVE, WhatsappPhoneNumberStatus.PENDING_ACTIVATION],
          },
        },
        select: { id: true, displayPhoneNumber: true, phoneNumberId: true, status: true },
        orderBy: [{ isPrimary: "desc" }, { updatedAt: "desc" }],
        take: 1,
      }),
    ]);

    const wpn = activeLines[0] ?? null;
    const phoneConnected = Boolean(wpn);
    const promptReady = Boolean((tenant?.systemPrompt || tenant?.defaultPrompt || "").trim());
    const apiKeyReady = Boolean(tenant?.apiKey);
    const activationComplete = phoneConnected && promptReady;

    return {
      authenticated: true,
      tenantId: payload.tenantId,
      tenantName: tenant?.name ?? null,
      phoneConnected,
      promptReady,
      apiKeyReady,
      activationComplete,
      primaryBusinessDisplayNumber: wpn?.displayPhoneNumber?.trim() || null,
      primaryBusinessPhoneNumberId: wpn?.phoneNumberId ?? null,
      primaryLineStatus: wpn?.status ?? null,
    };
  } catch {
    return { authenticated: false };
  }
}
