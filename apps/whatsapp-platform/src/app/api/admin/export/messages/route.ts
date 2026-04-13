import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest, requireRole, ROLES_MANAGER_PLUS } from "@/modules/auth";
import { listInboxMessagesCreatedInRange } from "@/modules/inbox/waInboxOpsMetrics";

function escapeCsvCell(value: string | number | null | undefined): string {
  if (value == null) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ROLES_MANAGER_PLUS, request);
  if (denied) return denied;
  if (!auth) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const tenantId = auth.payload.tenantId;
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const to = searchParams.get("to") ?? new Date().toISOString().slice(0, 10);
  const fromDate = new Date(`${from}T00:00:00.000Z`);
  const toDate = new Date(`${to}T23:59:59.999Z`);

  try {
    const messages = await listInboxMessagesCreatedInRange(tenantId, fromDate, toDate);
    const headers = ["id", "thread_id", "direction", "body", "created_at"];
    const rows = messages.map((m) => {
      const r: Record<string, string> = {
        id: m.id,
        thread_id: m.threadId,
        direction: m.direction,
        body: m.body ?? "",
        created_at: m.createdAt.toISOString(),
      };
      return headers.map((h) => escapeCsvCell(r[h])).join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const filename = `messages-${from}-${to}.csv`;
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("[export/messages]", err);
    return NextResponse.json({ error: "Falha ao exportar" }, { status: 500 });
  }
}
