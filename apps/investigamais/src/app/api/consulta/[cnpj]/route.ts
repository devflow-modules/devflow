import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/modules/auth";
import { queryCnpj } from "@/modules/cnpj";
import { hasSupabaseConfig } from "@/lib/supabase-server";

export async function GET(request: NextRequest, context: { params: Promise<{ cnpj: string }> }) {
  const auth = await getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { cnpj } = await context.params;
  if (!cnpj) return NextResponse.json({ error: "CNPJ obrigatório" }, { status: 400 });
  if (!hasSupabaseConfig()) return NextResponse.json({ error: "Serviço temporariamente indisponível" }, { status: 503 });
  const result = await queryCnpj(decodeURIComponent(cnpj), auth.payload.cpf);
  if ("error" in result) {
    const status = "status" in result ? result.status ?? 500 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json(result);
}
