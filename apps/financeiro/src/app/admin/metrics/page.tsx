import type { Metadata } from "next";
import { MetricsDashboardClient } from "./MetricsDashboardClient";
import { getMetrics } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Métricas internas | Admin",
  description: "Dashboard interno de métricas do produto e funil.",
  robots: "noindex, nofollow",
};

export default async function AdminMetricsPage() {
  const data = await getMetrics();
  return (
    <div className="min-h-screen bg-background">
      <MetricsDashboardClient initialData={data} />
    </div>
  );
}
