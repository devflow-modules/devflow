"use client";

import type { SystemHealthSummary } from "@/modules/dashboard/buildSystemHealthSummary";

function bannerClass(overall: SystemHealthSummary["overall"]): string {
  if (overall === "ok") return "df-status-summary-banner--ok";
  if (overall === "attention") return "df-status-summary-banner--attention";
  return "df-status-summary-banner--critical";
}

function statusLabel(overall: SystemHealthSummary["overall"]): string {
  if (overall === "ok") return "Estado: OK";
  if (overall === "attention") return "Estado: atenção";
  return "Estado: crítico";
}

/**
 * Sinal curto de saúde na 1ª dobra (dashboard-ai F1).
 * O painel completo fica em details — não duplica controlos.
 */
export function HealthCriticalSignal({
  summary,
  error,
  loading,
}: {
  summary: SystemHealthSummary | null;
  error: string | null;
  loading?: boolean;
}) {
  if (error) {
    return (
      <div
        className="df-feedback-error rounded-xl px-4 py-2.5 text-sm"
        data-testid="health-critical-signal"
        role="status"
      >
        <p className="font-medium">Canal: não foi possível carregar o estado.</p>
      </div>
    );
  }

  if (loading && !summary) {
    return (
      <div
        className="h-10 animate-pulse rounded-xl bg-[color-mix(in_srgb,var(--df-border-dark)_45%,var(--df-bg-elevated))]"
        data-testid="health-critical-signal"
        aria-hidden
      />
    );
  }

  if (!summary) return null;

  const icon = summary.overall === "ok" ? "✅" : summary.overall === "attention" ? "⚠️" : "❌";

  return (
    <div
      className={bannerClass(summary.overall)}
      data-testid="health-critical-signal"
      role="status"
      aria-label={statusLabel(summary.overall)}
    >
      <p className="text-sm font-semibold">
        <span aria-hidden>{icon}</span> {summary.message}
      </p>
    </div>
  );
}
