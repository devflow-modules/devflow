"use server";

import { getCounters } from "@devflow/analytics-core";
import { hasSupabaseConfig } from "@/lib/supabase-server";
import { countUsers } from "@/modules/users";
import { countConsultas } from "@/modules/cnpj";

const PREFIX = "investiga.";

export type AdminMetricsPayload = {
  investigamais: { metrics: Record<string, number> };
  ops: { users: number; queries: number; cacheHitRate: number };
};

export async function getAdminMetrics(): Promise<AdminMetricsPayload> {
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

  return {
    investigamais: { metrics },
    ops: { users, queries, cacheHitRate },
  };
}
