import { CareerAnalyticsPanel } from "@/components/dashboard/career-analytics-panel";
import { resolveDashboardPersistenceBootstrap } from "@/lib/persistence-v2/dashboard/resolve-dashboard-persistence-bootstrap";

export default async function CareerAnalyticsPage() {
  const persistenceBootstrap = await resolveDashboardPersistenceBootstrap();

  return (
    <main className="relative border-b border-[color:var(--af-border)]/80">
      <div className="relative mx-auto max-w-5xl px-4 py-10 sm:px-5 sm:py-12">
        <CareerAnalyticsPanel persistenceBootstrap={persistenceBootstrap} />
      </div>
    </main>
  );
}
