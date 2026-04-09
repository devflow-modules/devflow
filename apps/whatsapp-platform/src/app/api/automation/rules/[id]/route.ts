import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/modules/auth";
import { prisma } from "@/lib/prisma";
import { recordPlatformAudit } from "@/lib/platformAuditLog";
import { getClientIp } from "@/lib/rate-limit";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const tenantId = auth.payload.tenantId;
  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const rule = await prisma.waAutomationRule.findFirst({
    where: { id, tenantId },
  });
  if (!rule) return NextResponse.json({ error: "Regra não encontrada" }, { status: 404 });

  const updated = await prisma.waAutomationRule.update({
    where: { id },
    data: {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.isActive !== undefined && { isActive: parsed.data.isActive }),
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      rule: {
        id: updated.id,
        name: updated.name,
        isActive: updated.isActive,
        triggerType: updated.triggerType,
        createdAt: updated.createdAt.toISOString(),
      },
    },
  });
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(_req);
  if (!auth) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const tenantId = auth.payload.tenantId;
  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  const rule = await prisma.waAutomationRule.findFirst({
    where: { id, tenantId },
  });
  if (!rule) return NextResponse.json({ error: "Regra não encontrada" }, { status: 404 });
  if (rule.isSystem) {
    return NextResponse.json(
      { error: "Regras de sistema não podem ser removidas. Desative-as na lista." },
      { status: 400 }
    );
  }

  await prisma.waAutomationRule.delete({ where: { id } });

  recordPlatformAudit({
    action: "automation_rule_delete",
    tenantId,
    userId: auth.payload.sub,
    resourceType: "wa_automation_rule",
    resourceId: id,
    ip: getClientIp(_req),
    metadata: { name: rule.name },
  });

  return NextResponse.json({ success: true, data: { deleted: true } });
}
