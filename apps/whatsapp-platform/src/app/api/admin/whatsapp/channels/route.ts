import { NextRequest } from "next/server";
import { jsonError, jsonSuccess, newTraceId } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { gatePlatformAdminOrProvisionSecret } from "@/lib/adminApiAuth";

export const dynamic = "force-dynamic";

export type AdminWhatsappChannelListItem = {
  id: string;
  tenantId: string;
  tenantName: string;
  phone: string;
  wabaId: string | null;
  phoneNumberId: string;
  status: string;
  /** Não expõe o token; só indica se existe valor persistido. */
  hasToken: boolean;
  readyForOutbound: boolean;
  updatedAt: string;
};

/**
 * GET — lista canais WhatsApp (todos os tenants).
 * Auth: Bearer secret ou JWT `platform_admin`.
 */
export async function GET(request: NextRequest) {
  const traceId = newTraceId();
  const gate = await gatePlatformAdminOrProvisionSecret(request);
  if (!gate.ok) return gate.response;

  try {
    const rows = await prisma.whatsappPhoneNumber.findMany({
      include: { tenant: { select: { id: true, name: true } } },
      orderBy: { updatedAt: "desc" },
    });

    const channels: AdminWhatsappChannelListItem[] = rows.map((r) => {
      const hasToken = Boolean(r.accessToken?.trim());
      const readyForOutbound = r.status === "ACTIVE" && hasToken;
      return {
        id: r.id,
        tenantId: r.tenantId,
        tenantName: r.tenant.name?.trim() || r.tenantId,
        phone: r.displayPhoneNumber?.trim() || "—",
        wabaId: r.wabaId,
        phoneNumberId: r.phoneNumberId,
        status: r.status,
        hasToken,
        readyForOutbound,
        updatedAt: r.updatedAt.toISOString(),
      };
    });

    return jsonSuccess({ channels }, { traceId });
  } catch (e) {
    console.error("[GET /api/admin/whatsapp/channels]", e);
    return jsonError("LIST_FAILED", "Não foi possível listar os canais.", 500, { traceId });
  }
}
