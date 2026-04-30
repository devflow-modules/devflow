import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonSuccess, newTraceId } from "@/lib/api-response";
import { logChannelEvent } from "@/modules/whatsapp/channelEventService";
import { activateWhatsappChannel } from "@/modules/whatsapp/whatsappChannelLifecycle";
import { gatePlatformAdminOrProvisionSecret } from "@/lib/adminApiAuth";
import { getClientIp } from "@/lib/rate-limit";
import { recordPlatformAudit } from "@/lib/platformAuditLog";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  channelId: z.string().min(1),
  accessToken: z.string().min(10),
});

/**
 * POST — valida token na Meta e ativa o canal.
 * Auth: `Bearer WHATSAPP_MANUAL_PROVISION_SECRET` (automação) ou JWT `platform_admin`.
 */
export async function POST(request: NextRequest) {
  const traceId = newTraceId();
  const gate = await gatePlatformAdminOrProvisionSecret(request);
  if (!gate.ok) return gate.response;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "JSON inválido", 400, { traceId });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", "Dados inválidos", 400, { traceId });
  }

  try {
    const row = await activateWhatsappChannel(parsed.data);
    recordPlatformAudit({
      action: "admin.whatsapp.channel.activate",
      tenantId: row.tenantId,
      userId: gate.auth?.payload.sub ?? null,
      resourceType: "whatsapp_channel",
      resourceId: row.id,
      ip: getClientIp(request),
      metadata: gate.viaProvisionSecret
        ? { authVia: "provision_bearer" }
        : { authVia: "platform_admin_session" },
    });
    return jsonSuccess(
      {
        channelId: row.id,
        tenantId: row.tenantId,
        phoneNumberId: row.phoneNumberId,
        status: row.status,
      },
      { traceId }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "CHANNEL_NOT_FOUND") {
      return jsonError("CHANNEL_NOT_FOUND", "Canal não encontrado.", 404, { traceId });
    }
    const code = (e as Error & { code?: string }).code;
    await logChannelEvent({
      channelId: parsed.data.channelId,
      type: "ERROR",
      message: msg.slice(0, 500),
      metadata: code ? { code } : undefined,
    }).catch(() => {});
    return jsonError("ACTIVATION_FAILED", msg, 422, { traceId });
  }
}
