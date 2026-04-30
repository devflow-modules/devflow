import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest, requireRole, ROLES_PLATFORM_ONLY } from "@/modules/auth";
import { listInboxThreadsCreatedInRange } from "@/modules/inbox/waInboxOpsMetrics";

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
  const denied = requireRole(auth, ROLES_PLATFORM_ONLY, request);
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
    const rows = await listInboxThreadsCreatedInRange(tenantId, fromDate, toDate);
    const headers = ["id", "wa_from", "status", "created_at", "updated_at", "last_message_at"];
    const lines = rows.map((c) => {
      const r: Record<string, string> = {
        id: c.id,
        wa_from: c.phoneNumber,
        status: c.status,
        created_at: c.createdAt.toISOString(),
        updated_at: c.updatedAt.toISOString(),
        last_message_at: c.lastMessageAt.toISOString(),
      };
      return headers.map((h) => escapeCsvCell(r[h])).join(",");
    });
    const csv = [headers.join(","), ...lines].join("\n");
    const filename = `conversations-${from}-${to}.csv`;
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("[export/conversations]", err);
    return NextResponse.json({ error: "Falha ao exportar" }, { status: 500 });
  }
}
