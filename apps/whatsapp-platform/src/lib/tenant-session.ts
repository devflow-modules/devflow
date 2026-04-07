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
      apiKeyReady: boolean;
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

    const [tenant, activePhone] = await Promise.all([
      prisma.tenant.findUnique({
        where: { id: payload.tenantId },
        select: {
          name: true,
          systemPrompt: true,
          defaultPrompt: true,
          apiKey: true,
        },
      }),
      prisma.whatsappPhoneNumber.findFirst({
        where: { tenantId: payload.tenantId, status: WhatsappPhoneNumberStatus.ACTIVE },
        select: { id: true },
      }),
    ]);

    const phoneConnected = Boolean(activePhone);
    const promptReady = Boolean((tenant?.systemPrompt || tenant?.defaultPrompt || "").trim());
    const apiKeyReady = Boolean(tenant?.apiKey);

    return {
      authenticated: true,
      tenantId: payload.tenantId,
      tenantName: tenant?.name ?? null,
      phoneConnected,
      promptReady,
      apiKeyReady,
    };
  } catch {
    return { authenticated: false };
  }
}
