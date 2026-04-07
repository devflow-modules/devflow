import { cookies } from "next/headers";
import { JWT_COOKIE_NAME } from "@/lib/auth-config";
import { validateAuthToken } from "@/modules/auth/verifyToken";
import { prisma } from "@/lib/prisma";

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

    const tenant = await prisma.tenant.findUnique({
      where: { id: payload.tenantId },
      select: {
        name: true,
        phoneNumberId: true,
        accessToken: true,
        systemPrompt: true,
        defaultPrompt: true,
        apiKey: true,
      },
    });

    const phoneConnected = Boolean(tenant?.phoneNumberId?.trim() && tenant?.accessToken?.trim());
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
