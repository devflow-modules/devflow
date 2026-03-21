/**
 * GET  /api/whatsapp/phone-numbers — lista números conectados do tenant
 * DELETE /api/whatsapp/phone-numbers?id=xxx — remove número
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@wa/modules/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
  }

  const tenantId = auth.payload.tenantId;
  if (!tenantId) {
    return NextResponse.json({ success: false, error: "Tenant não identificado" }, { status: 400 });
  }

  const numbers = await prisma.whatsappPhoneNumber.findMany({
    where: { tenantId },
    select: {
      id: true,
      phoneNumberId: true,
      displayPhoneNumber: true,
      wabaId: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    success: true,
    data: numbers.map((n) => ({
      id: n.id,
      phoneNumberId: n.phoneNumberId,
      displayPhoneNumber: n.displayPhoneNumber,
      wabaId: n.wabaId,
      status: n.status,
      createdAt: n.createdAt.toISOString(),
    })),
  });
}

export async function DELETE(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
  }

  const tenantId = auth.payload.tenantId;
  if (!tenantId) {
    return NextResponse.json({ success: false, error: "Tenant não identificado" }, { status: 400 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ success: false, error: "id é obrigatório" }, { status: 400 });
  }

  const existing = await prisma.whatsappPhoneNumber.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    return NextResponse.json(
      { success: false, error: "Número não encontrado ou não pertence ao seu tenant" },
      { status: 404 }
    );
  }

  await prisma.whatsappPhoneNumber.delete({
    where: { id },
  });

  return NextResponse.json({ success: true, data: { removed: id } });
}
