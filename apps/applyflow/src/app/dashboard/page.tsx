import { DashboardClient } from "@/components/dashboard/dashboard-client";

export default function DashboardPage() {
  return (
    <main className="relative border-b border-[color:var(--af-border)]/80">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(52,211,153,0.06),transparent_50%)]" />
      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-5 sm:py-12">
        <DashboardClient />
      </div>
    </main>
  );
}
