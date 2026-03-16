import type { Metadata } from "next";
import { MetricsDashboardClient } from "./MetricsDashboardClient";
import { getAdminMetrics } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Métricas internas | Admin — WhatsApp Platform",
  description: "Dashboard interno de métricas do produto.",
  robots: "noindex, nofollow",
};

export default async function AdminMetricsPage() {
  const data = await getAdminMetrics();
  return (
    <div className="min-h-screen bg-background">
      <MetricsDashboardClient initialData={data} />
    </div>
  );
}
