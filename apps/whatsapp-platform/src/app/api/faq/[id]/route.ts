import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthFromRequest } from "@/modules/auth";
import { prisma } from "@/lib/prisma";

const putSchema = z.object({
  question: z.string().min(1).optional(),
  answer: z.string().min(1).optional(),
  keywords: z.string().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await params;
  const faq = await prisma.fAQ.findFirst({ where: { id, tenantId: auth.payload.tenantId } });
  if (!faq) return NextResponse.json({ error: "FAQ não encontrado" }, { status: 404 });
  return NextResponse.json(faq);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await params;
  const parsed = putSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  const updated = await prisma.fAQ.updateMany({
    where: { id, tenantId: auth.payload.tenantId },
    data: parsed.data,
  });
  if (updated.count === 0) return NextResponse.json({ error: "FAQ não encontrado" }, { status: 404 });
  const faq = await prisma.fAQ.findUnique({ where: { id } });
  return NextResponse.json(faq);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await params;
  const result = await prisma.fAQ.deleteMany({ where: { id, tenantId: auth.payload.tenantId } });
  if (result.count === 0) return NextResponse.json({ error: "FAQ não encontrado" }, { status: 404 });
  return NextResponse.json({ success: true });
}
