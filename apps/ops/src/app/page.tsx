import { getAggregatedMetrics } from "./actions";
import { DashboardClient } from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function OpsDashboardPage() {
  const data = await getAggregatedMetrics();
  return (
    <div className="min-h-screen bg-background">
      <DashboardClient initialData={data} />
    </div>
  );
}
