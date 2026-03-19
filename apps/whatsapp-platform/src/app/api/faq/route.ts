import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthFromRequest } from "@/modules/auth";
import { prisma } from "@/lib/prisma";

const postSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  keywords: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const list = await prisma.fAQ.findMany({
    where: { tenantId: auth.payload.tenantId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ faqs: list });
}

export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const parsed = postSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  const faq = await prisma.fAQ.create({
    data: {
      tenantId: auth.payload.tenantId,
      question: parsed.data.question,
      answer: parsed.data.answer,
      keywords: parsed.data.keywords ?? null,
    },
  });
  return NextResponse.json(faq);
}
