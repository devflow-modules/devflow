import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/modules/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id: conversationId } = await params;
  const format = request.nextUrl.searchParams.get("format") ?? "csv";

  const conv = await prisma.conversation.findFirst({
    where: { id: conversationId, tenantId: auth.payload.tenantId },
  });
  if (!conv) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { timestamp: "asc" },
  });

  if (format === "csv") {
    const header = "timestamp,sender,content\n";
    const rows = messages.map(
      (m) =>
        `${m.timestamp.toISOString()},"${m.sender}","${m.content.replace(/"/g, '""')}"`
    );
    const csv = header + rows.join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="conversation-${conversationId}.csv"`,
      },
    });
  }

  return NextResponse.json({ error: "Formato não suportado. Use format=csv" }, { status: 400 });
}
