import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/modules/auth";
import { getOverviewMetrics, getConversationStats, getIntentDistribution } from "@/modules/metrics";

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
    const [overview, stats, intents] = await Promise.all([
      getOverviewMetrics(auth.payload.tenantId, range),
      getConversationStats(auth.payload.tenantId, range),
      getIntentDistribution(auth.payload.tenantId, range),
    ]);
    return NextResponse.json({
      overview,
      stats,
      intents,
    });
  } catch (err) {
    console.error("[metrics/overview]", err);
    return NextResponse.json({ error: "Erro ao buscar métricas" }, { status: 500 });
  }
}
