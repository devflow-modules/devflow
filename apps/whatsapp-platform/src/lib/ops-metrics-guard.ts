import { NextRequest, NextResponse } from "next/server";
import { getClientIp } from "@/lib/rate-limit";
import { logEvent } from "@/lib/observability/log-event";
import { trackOpsMetricsDeniedForAlert } from "@/lib/observability/alerts";

/**
 * Header esperado em GET /api/ops/metrics quando `WHATSAPP_OPS_METRICS_SECRET` está definido.
 * O dashboard Ops (`apps/ops`) envia o mesmo valor em `OPS_WHATSAPP_METRICS_KEY`.
 */
export const OPS_METRICS_KEY_HEADER = "x-ops-metrics-key";

/**
 * @returns `NextResponse` para devolver imediatamente, ou `null` se o pedido pode continuar.
 * - Produção sem secret configurado: **503** (falha de deploy).
 * - Secret configurado: header obrigatório e igual ao secret → senão **401**.
 * - Desenvolvimento sem secret: permite (DX local); com secret: mesma regra que produção.
 */
export function guardOpsMetricsRequest(request: NextRequest): NextResponse | null {
  const configured = process.env.WHATSAPP_OPS_METRICS_SECRET?.trim();
  const isProd = process.env.NODE_ENV === "production";

  if (isProd && !configured) {
    logEvent("warn", "ops", "metrics_misconfigured", { detail: "WHATSAPP_OPS_METRICS_SECRET ausente em produção" });
    return NextResponse.json(
      { error: "Métricas ops não configuradas no servidor" },
      { status: 503 }
    );
  }

  if (!configured) {
    return null;
  }

  const presented = request.headers.get(OPS_METRICS_KEY_HEADER)?.trim();
  if (!presented || presented !== configured) {
    const ip = getClientIp(request);
    logEvent("warn", "ops", "metrics_access_denied", { reason: "invalid_or_missing_key", ip });
    trackOpsMetricsDeniedForAlert(ip);
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  return null;
}
