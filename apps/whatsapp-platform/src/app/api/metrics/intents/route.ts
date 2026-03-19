import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/modules/auth";
import { getIntentDistribution } from "@/modules/metrics";

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
    const data = await getIntentDistribution(auth.payload.tenantId, range);
    return NextResponse.json({ intents: data });
  } catch (err) {
    console.error("[metrics/intents]", err);
    return NextResponse.json({ error: "Erro ao buscar distribuição de intenções" }, { status: 500 });
  }
}
