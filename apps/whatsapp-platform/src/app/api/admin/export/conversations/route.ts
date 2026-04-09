import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest, requireRole, ROLES_MANAGER_PLUS } from "@/modules/auth";
import { hasSupabaseConfig } from "@/lib/supabase-server";
import { listConversationsByDateRange } from "@/modules/conversations";

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

  if (!hasSupabaseConfig()) {
    return NextResponse.json({ error: "Supabase não configurado" }, { status: 503 });
  }
  const tenantId = auth.payload.tenantId;
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const to = searchParams.get("to") ?? new Date().toISOString().slice(0, 10);
  const fromDate = `${from}T00:00:00.000Z`;
  const toDate = `${to}T23:59:59.999Z`;

  try {
    const conversations = await listConversationsByDateRange(tenantId, fromDate, toDate);
    const headers = ["id", "wa_from", "status", "created_at", "updated_at", "last_message_at"];
    const rows = conversations.map((c) => {
      const r = c as unknown as Record<string, string | number | null | undefined>;
      return headers.map((h) => escapeCsvCell(r[h])).join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
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
