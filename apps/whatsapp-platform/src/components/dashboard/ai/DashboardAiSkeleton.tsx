"use client";

/**
 * Skeleton alinhado à hierarquia F1–F3 / F4:
 * sinal crítico → ações → saúde recolhida → KPIs essenciais (3).
 */
export function DashboardAiSkeleton() {
  return (
    <div
      className="df-stack min-w-0 animate-pulse space-y-4"
      data-testid="dashboard-ai-skeleton"
      aria-busy="true"
      aria-label="A carregar prioridades"
    >
      <div
        className="h-12 rounded-xl bg-[color-mix(in_srgb,var(--df-border-dark)_50%,var(--df-bg-elevated))]"
        data-testid="dashboard-ai-skeleton-signal"
      />
      <div
        className="h-28 rounded-xl bg-[color-mix(in_srgb,var(--df-border-dark)_48%,var(--df-bg-elevated))]"
        data-testid="dashboard-ai-skeleton-actions"
      />
      <div
        className="h-12 rounded-xl bg-[color-mix(in_srgb,var(--df-border-dark)_45%,var(--df-bg-elevated))]"
        data-testid="dashboard-ai-skeleton-health"
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="dashboard-ai-skeleton-kpis">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-28 rounded-xl bg-[color-mix(in_srgb,var(--df-border-dark)_42%,var(--df-bg-elevated))]"
          />
        ))}
      </div>
    </div>
  );
}

export function DashboardAiBlockSkeleton({
  heightClass = "h-28",
  testId,
}: {
  heightClass?: string;
  testId?: string;
}) {
  return (
    <div
      className={`${heightClass} animate-pulse rounded-xl bg-[color-mix(in_srgb,var(--df-border-dark)_45%,var(--df-bg-elevated))]`}
      data-testid={testId}
      aria-busy="true"
    />
  );
}