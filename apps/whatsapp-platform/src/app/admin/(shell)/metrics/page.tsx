import type { Metadata } from "next";
import { requireAdminOrMetricsSecretPage } from "@/lib/admin-page-guard";
import { MetricsDashboardClient } from "./MetricsDashboardClient";
import { getAdminMetrics } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Métricas internas | Admin — WhatsApp Platform",
  description: "Dashboard interno de métricas do produto.",
  robots: "noindex, nofollow",
};

export default async function AdminMetricsPage() {
  await requireAdminOrMetricsSecretPage("/admin/metrics");
  const data = await getAdminMetrics();
  return <MetricsDashboardClient initialData={data} />;
}
