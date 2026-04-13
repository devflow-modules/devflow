import { NextResponse } from "next/server";
import { getCounters } from "@devflow/analytics-core";
import { jsonError, newTraceId } from "@/lib/api-response";
import {
  countInboxThreadsTotal,
  countTenantsTotal,
} from "@/modules/inbox/waInboxOpsMetrics";
import { countMessagesLast24h } from "@/modules/messaging/waInboxMessageStats";
import { isAdminMetricsAllowed } from "./adminAuth";

export async function GET(request: Request) {
  if (!isAdminMetricsAllowed(request)) {
    return jsonError("FORBIDDEN", "Forbidden", 403);
  }

  const metrics = getCounters();
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
    console.error("[admin/metrics]", err);
  }

  const trace_id = newTraceId();
  return NextResponse.json(
    {
      whatsapp_platform: { metrics },
      ops: { tenants, conversations, messagesLast24h },
      trace_id,
    },
    { headers: { "X-Trace-Id": trace_id } }
  );
}
