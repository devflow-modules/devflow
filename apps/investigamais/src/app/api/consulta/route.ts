import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/modules/auth";
import { listHistory } from "@/modules/history";
import { trackHistoryViewed } from "@/modules/analytics";
import { hasSupabaseConfig } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSupabaseConfig()) return NextResponse.json({ rows: [], total: 0 });
  trackHistoryViewed();
  const sp = request.nextUrl.searchParams;
  const { rows, total } = await listHistory({
    cpf: auth.payload.cpf,
    page: Number(sp.get("page")) || 1,
    limit: Number(sp.get("limit")) || 5,
    status: sp.get("status") ?? undefined,
    dataInicio: sp.get("dataInicio") ?? undefined,
    dataFim: sp.get("dataFim") ?? undefined,
    nome: sp.get("nome") ?? undefined,
    cnpj: sp.get("cnpj") ?? undefined,
  });
  return NextResponse.json({ rows, total });
}
