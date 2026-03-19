import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/modules/auth";
import { getAgentPerformance } from "@/modules/metrics";

function parseRange(searchParams: URLSearchParams): { dateFrom?: Date; dateTo?: Date } {
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  return {
    dateFrom: dateFrom ? new Date(dateFrom) : undefined,
    dateTo: dateTo ? new Date(dateTo) : undefined,
  };
}

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const range = parseRange(request.nextUrl.searchParams);

  try {
    const data = await getAgentPerformance(auth.payload.tenantId, range);
    return NextResponse.json(data);
  } catch (err) {
    console.error("[metrics/agents]", err);
    return NextResponse.json({ error: "Erro ao buscar métricas de agentes" }, { status: 500 });
  }
}
