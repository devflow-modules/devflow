import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonSuccess, newTraceId } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { getChannelAdminDetail } from "@/modules/whatsapp/channelActivationService";
import { gatePlatformAdminOrProvisionSecret } from "@/lib/adminApiAuth";
import { WhatsappChannelPurpose } from "@/generated/prisma-whatsapp";

export const dynamic = "force-dynamic";

const patchChannelBodySchema = z.object({
  label: z.string().max(120).optional().nullable(),
  purpose: z.nativeEnum(WhatsappChannelPurpose).optional(),
  autoReplyEnabled: z.boolean().nullable().optional(),
  aiProfileOverride: z.string().max(12_000).optional().nullable(),
});

/**
 * GET — detalhe de canal (admin): SLA, último evento.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const traceId = newTraceId();
  const gate = await gatePlatformAdminOrProvisionSecret(request);
  if (!gate.ok) return gate.response;

  const { id } = await context.params;
  if (!id?.trim()) {
    return jsonError("VALIDATION_ERROR", "ID inválido.", 400, { traceId });
  }

  try {
    const detail = await getChannelAdminDetail(id.trim());
    if (!detail) {
      return jsonError("NOT_FOUND", "Canal não encontrado.", 404, { traceId });
    }
    return jsonSuccess(detail, { traceId });
  } catch (e) {
    console.error("[GET /api/admin/whatsapp/channels/:id]", e);
    return jsonError("DETAIL_FAILED", "Não foi possível carregar o canal.", 500, { traceId });
  }
}

/**
 * PATCH — configuração básica da linha (label, finalidade, overrides de IA / auto-reply).
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const traceId = newTraceId();
  const gate = await gatePlatformAdminOrProvisionSecret(request);
  if (!gate.ok) return gate.response;

  const { id } = await context.params;
  if (!id?.trim()) {
    return jsonError("VALIDATION_ERROR", "ID inválido.", 400, { traceId });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("VALIDATION_ERROR", "Body JSON inválido.", 400, { traceId });
  }

  const parsed = patchChannelBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", "Dados inválidos.", 400, { traceId });
  }

  const data = parsed.data;
  if (Object.keys(data).length === 0) {
    return jsonError("VALIDATION_ERROR", "Nada a actualizar.", 400, { traceId });
  }

  try {
    const existing = await prisma.whatsappPhoneNumber.findUnique({
      where: { id: id.trim() },
    });
    if (!existing) {
      return jsonError("NOT_FOUND", "Canal não encontrado.", 404, { traceId });
    }

    const updated = await prisma.whatsappPhoneNumber.update({
      where: { id: id.trim() },
      data: {
        ...(data.label !== undefined ? { label: data.label } : {}),
        ...(data.purpose !== undefined ? { purpose: data.purpose } : {}),
        ...(data.autoReplyEnabled !== undefined ? { autoReplyEnabled: data.autoReplyEnabled } : {}),
        ...(data.aiProfileOverride !== undefined ? { aiProfileOverride: data.aiProfileOverride } : {}),
      },
      include: { tenant: { select: { name: true } } },
    });

    const hasToken = Boolean(updated.accessToken?.trim());
    const readyForOutbound = updated.status === "ACTIVE" && hasToken;

    return jsonSuccess(
      {
        channel: {
          id: updated.id,
          tenantId: updated.tenantId,
          tenantName: updated.tenant.name?.trim() || updated.tenantId,
          phone: updated.displayPhoneNumber?.trim() || "—",
          wabaId: updated.wabaId,
          phoneNumberId: updated.phoneNumberId,
          status: updated.status,
          hasToken,
          readyForOutbound,
          updatedAt: updated.updatedAt.toISOString(),
          label: updated.label,
          purpose: updated.purpose,
          autoReplyEnabled: updated.autoReplyEnabled,
          aiProfileOverride: updated.aiProfileOverride,
        },
      },
      { traceId }
    );
  } catch (e) {
    console.error("[PATCH /api/admin/whatsapp/channels/:id]", e);
    return jsonError("UPDATE_FAILED", "Não foi possível actualizar o canal.", 500, { traceId });
  }
}
