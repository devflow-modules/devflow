import { NextResponse } from "next/server";
import { APP_PRODUCT_SLUG } from "@/lib/config";
import { hasSupabaseConfig } from "@/lib/supabase-server";
import { getCounters } from "@devflow/analytics-core";
import { countUsers } from "@/modules/users";
import { countConsultas } from "@/modules/cnpj";

const PREFIX = "investiga.";

export async function GET() {
  let users = 0;
  let queries = 0;
  if (hasSupabaseConfig()) {
    try {
      users = await countUsers();
      queries = await countConsultas();
    } catch (e) {
      console.error("[ops/metrics]", e);
    }
  }
  const counters = getCounters();
  const cacheHits = counters[PREFIX + "cnpj_cache_hit"] ?? 0;
  const cacheMisses = counters[PREFIX + "cnpj_cache_miss"] ?? 0;
  const total = cacheHits + cacheMisses;
  const cacheHitRate = total > 0 ? Math.round((cacheHits / total) * 100) / 100 : 0;

  return NextResponse.json({
    product: APP_PRODUCT_SLUG,
    users,
    activeSubscriptions: 0,
    pendingCancellation: 0,
    mrr: 0,
    queries,
    cacheHitRate,
  });
}
