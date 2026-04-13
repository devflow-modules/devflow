import { NextRequest, NextResponse } from "next/server";
import { newTraceId } from "@/lib/api-response";
import { APP_PRODUCT_SLUG } from "@/lib/constants";
import { guardOpsMetricsRequest } from "@/lib/ops-metrics-guard";
import {
  countInboxThreadsTotal,
  countTenantsTotal,
} from "@/modules/inbox/waInboxOpsMetrics";
import { countMessagesLast24h } from "@/modules/messaging/waInboxMessageStats";

/**
 * Contrato Ops: GET /api/ops/metrics
 * Proteção: ver `guardOpsMetricsRequest` e `WHATSAPP_OPS_METRICS_SECRET`.
 * Billing (users, activeSubscriptions, pendingCancellation, mrr): 0 — não implementado para este produto.
 * tenants, conversations, messagesLast24h: Prisma (fonte única com inbox).
 */
export async function GET(request: NextRequest) {
  const denied = guardOpsMetricsRequest(request);
  if (denied) return denied;

  let tenants = 0;
  let conversations = 0;
  let messagesLast24h = 0;

  try {
    [tenants, conversations, messagesLast24h] = await Promise.all([
      countTenantsTotal(),
      countInboxThreadsTotal(),
      countMessagesLast24h(),
    ]);
  } catch (err) {
    console.error("[Ops metrics]", err);
  }

  const trace_id = newTraceId();
  const payload = {
    product: APP_PRODUCT_SLUG,
    users: 0,
    activeSubscriptions: 0,
    pendingCancellation: 0,
    mrr: 0,
    tenants,
    conversations,
    messagesLast24h,
    trace_id,
  };
  return NextResponse.json(payload, { headers: { "X-Trace-Id": trace_id } });
}
