import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonSuccess, newTraceId } from "@/lib/api-response";
import { createWhatsappChannelManual } from "@/modules/whatsapp/whatsappChannelLifecycle";
import { authorizeProvisionOrPlatformAdmin } from "../../provisionAuth";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  tenantId: z.string().min(1),
  phone: z.string().min(8).max(32),
  wabaId: z.string().min(1),
  phoneNumberId: z.string().min(1),
});

/**
 * POST — cria linha WhatsApp manual (pending_activation, sem token).
 * Auth: `Authorization: Bearer WHATSAPP_MANUAL_PROVISION_SECRET` ou JWT `platform_admin`.
 */
export async function POST(request: NextRequest) {
  const traceId = newTraceId();
  if (!(await authorizeProvisionOrPlatformAdmin(request))) {
    return jsonError("UNAUTHORIZED", "Não autorizado", 401, { traceId });
  }

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
