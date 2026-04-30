import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonSuccess, newTraceId } from "@/lib/api-response";
import { createWhatsappChannelManual } from "@/modules/whatsapp/whatsappChannelLifecycle";
import { gatePlatformAdminOrProvisionSecret } from "@/lib/adminApiAuth";
import { getClientIp } from "@/lib/rate-limit";
import { recordPlatformAudit } from "@/lib/platformAuditLog";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  tenantId: z.string().min(1),
  phone: z.string().min(8).max(32),
  wabaId: z.string().min(1),
  phoneNumberId: z.string().min(1),
});

/**
 * POST — cria linha WhatsApp manual (pending_activation, sem token).
 * Auth: Bearer secret ou JWT `platform_admin`.
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
    const row = await createWhatsappChannelManual(parsed.data);
    recordPlatformAudit({
      action: "admin.whatsapp.channel.manual_create",
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
    if (msg === "PHONE_NUMBER_ID_IN_USE") {
      return jsonError("PHONE_NUMBER_ID_IN_USE", "Este Phone Number ID já está em uso.", 409, {
        traceId,
      });
    }
    return jsonError("PROVISION_FAILED", msg, 500, { traceId });
  }
}
