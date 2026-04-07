/**
 * PATCH /api/whatsapp/phone-numbers/:id — etiqueta, primário, default outbound
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthFromRequest } from "@/modules/auth";
import { prisma } from "@/lib/prisma";
import {
  setWhatsappLineAsDefaultOutbound,
  setWhatsappLineAsPrimary,
} from "@/modules/whatsapp/whatsappPhonePolicy";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  label: z.string().nullable().optional(),
  setPrimary: z.boolean().optional(),
  setDefaultOutbound: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
  }
  const tenantId = auth.payload.tenantId;
  if (!tenantId) {
    return NextResponse.json({ success: false, error: "Tenant não identificado" }, { status: 400 });
  }

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ success: false, error: "id obrigatório" }, { status: 400 });
  }

  const row = await prisma.whatsappPhoneNumber.findFirst({ where: { id, tenantId } });
  if (!row) {
    return NextResponse.json({ success: false, error: "Número não encontrado" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "JSON inválido" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Dados inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { label, setPrimary, setDefaultOutbound } = parsed.data;

  if (setPrimary === true) {
    await setWhatsappLineAsPrimary(tenantId, id);
  }
  if (setDefaultOutbound === true) {
    await setWhatsappLineAsDefaultOutbound(tenantId, id);
  }
  if (label !== undefined) {
    await prisma.whatsappPhoneNumber.update({
      where: { id },
      data: { label: label === null ? null : label.trim() || null },
    });
  }

  const updated = await prisma.whatsappPhoneNumber.findUnique({ where: { id } });
  if (!updated) {
    return NextResponse.json({ success: false, error: "Número não encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: {
      id: updated.id,
      phoneNumberId: updated.phoneNumberId,
      displayPhoneNumber: updated.displayPhoneNumber,
      wabaId: updated.wabaId,
      status: updated.status,
      isPrimary: updated.isPrimary,
      isDefaultOutbound: updated.isDefaultOutbound,
      label: updated.label,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
}
