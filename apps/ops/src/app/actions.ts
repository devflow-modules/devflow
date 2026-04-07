"use server";

import { getProductMetricsUrls } from "@/lib/ops-config";

export type ProductMetrics = {
  product: string;
  users?: number;
  activeSubscriptions?: number;
  pendingCancellation?: number;
  mrr?: number;
  tenants?: number;
  conversations?: number;
  messagesLast24h?: number;
  queries?: number;
  cacheHitRate?: number;
  error?: string;
};

function opsMetricsFetchHeaders(product: string): HeadersInit | undefined {
  const key =
    product === "whatsapp-platform"
      ? process.env.OPS_WHATSAPP_METRICS_KEY?.trim()
      : undefined;
  if (!key) return undefined;
  return { "X-Ops-Metrics-Key": key };
}

export async function getAggregatedMetrics(): Promise<ProductMetrics[]> {
  const urls = getProductMetricsUrls();
  const results = await Promise.all(
    urls.map(async ({ product, url }): Promise<ProductMetrics> => {
      try {
        const res = await fetch(url, {
          next: { revalidate: 30 },
          headers: opsMetricsFetchHeaders(product),
        });
        if (!res.ok) return { product, error: `HTTP ${res.status}` };
        const data = (await res.json()) as Record<string, unknown>;
        return {
          product: (data.product as string) ?? product,
          users: data.users as number | undefined,
          activeSubscriptions: data.activeSubscriptions as number | undefined,
          pendingCancellation: data.pendingCancellation as number | undefined,
          mrr: data.mrr as number | undefined,
          tenants: data.tenants as number | undefined,
          conversations: data.conversations as number | undefined,
          messagesLast24h: data.messagesLast24h as number | undefined,
          queries: data.queries as number | undefined,
          cacheHitRate: data.cacheHitRate as number | undefined,
        };
      } catch (e) {
        const message = e instanceof Error ? e.message : "Unknown error";
        return { product, error: message };
      }
    })
  );
  return results;
}
