import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest, requireRole, STAFF_ROLES } from "@/modules/auth";
import { prisma } from "@/lib/prisma";
import { WaInboxDirection } from "@/generated/prisma-whatsapp";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, STAFF_ROLES, request);
  if (denied) return denied;

  const { id: threadId } = await params;
  const format = request.nextUrl.searchParams.get("format") ?? "csv";

  const thread = await prisma.waInboxThread.findFirst({
    where: { id: threadId, tenantId: auth!.payload.tenantId },
  });
  if (!thread) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });

  const messages = await prisma.waInboxMessage.findMany({
    where: { tenantId: auth!.payload.tenantId, threadId },
    orderBy: { ts: "asc" },
  });

  if (format === "csv") {
    const header = "timestamp,direction,content\n";
    const rows = messages.map((m) => {
      const dir = m.direction === WaInboxDirection.INBOUND ? "inbound" : "outbound";
      const content = (m.contentText ?? "").replace(/"/g, '""');
      return `${m.ts.toISOString()},"${dir}","${content}"`;
    });
    const csv = header + rows.join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="conversation-${threadId}.csv"`,
      },
    });
  }

  return NextResponse.json({ error: "Formato não suportado. Use format=csv" }, { status: 400 });
}
