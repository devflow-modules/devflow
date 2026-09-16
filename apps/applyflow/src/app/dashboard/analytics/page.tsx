import { CareerAnalyticsPanel } from "@/components/dashboard/career-analytics-panel";

export default function CareerAnalyticsPage() {
  return (
    <main className="relative border-b border-[color:var(--af-border)]/80">
      <div className="relative mx-auto max-w-5xl px-4 py-10 sm:px-5 sm:py-12">
        <CareerAnalyticsPanel />
      </div>
    </main>
  );
}
