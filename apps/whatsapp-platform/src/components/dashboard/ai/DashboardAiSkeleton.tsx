"use client";

export function DashboardAiSkeleton() {
  return (
    <div className="df-stack min-w-0 animate-pulse space-y-6">
      <div className="h-24 rounded-xl bg-[color-mix(in_srgb,var(--df-border-dark)_50%,var(--df-bg-elevated))]" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-[color-mix(in_srgb,var(--df-border-dark)_48%,var(--df-bg-elevated))]" />
        ))}
      </div>
      <div className="h-32 rounded-xl bg-[color-mix(in_srgb,var(--df-border-dark)_45%,var(--df-bg-elevated))]" />
      <div className="h-40 rounded-xl bg-[color-mix(in_srgb,var(--df-border-dark)_42%,var(--df-bg-elevated))]" />
    </div>
  );
}
