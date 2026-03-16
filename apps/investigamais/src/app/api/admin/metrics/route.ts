import { NextResponse } from "next/server";
import { getCounters } from "@devflow/analytics-core";
import { hasSupabaseConfig } from "@/lib/supabase-server";
import { countUsers } from "@/modules/users";
import { countConsultas } from "@/modules/cnpj";

const PREFIX = "investiga.";

function isAllowed(request: Request): boolean {
  if (process.env.NODE_ENV === "development") return true;
  const secret = process.env.ADMIN_METRICS_SECRET;
  if (!secret) return false;
  const header = request.headers.get("x-admin-metrics-secret");
  return header === secret;
}

export async function GET(request: Request) {
  if (!isAllowed(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const metrics = getCounters();
  let users = 0;
  let queries = 0;
  if (hasSupabaseConfig()) {
    try {
      users = await countUsers();
      queries = await countConsultas();
    } catch (e) {
      console.error("[admin/metrics]", e);
    }
  }
  const cacheHits = metrics[PREFIX + "cnpj_cache_hit"] ?? 0;
  const cacheMisses = metrics[PREFIX + "cnpj_cache_miss"] ?? 0;
  const total = cacheHits + cacheMisses;
  const cacheHitRate = total > 0 ? Math.round((cacheHits / total) * 10000) / 100 : 0;

  return NextResponse.json({
    investigamais: { metrics },
    ops: { users, queries, cacheHitRate },
  });
}
