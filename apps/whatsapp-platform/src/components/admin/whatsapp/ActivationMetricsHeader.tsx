import type { ActivationMetrics } from "@/modules/whatsapp/channelActivationService";

function MetricBox({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-xl font-bold tabular-nums text-slate-900">{value}</p>
      {sub ? <p className="text-xs text-slate-500">{sub}</p> : null}
    </div>
  );
}

function formatAvg(m: number | null): string {
  if (m === null) return "—";
  return `${m} min`;
}

type Props = {
  metrics: ActivationMetrics | null;
  loading?: boolean;
};

export function ActivationMetricsHeader({ metrics, loading }: Props) {
  if (loading && !metrics) {
    return (
      <div
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
        data-testid="activation-metrics-skeleton"
        aria-busy
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-[4.25rem] animate-pulse rounded-lg bg-slate-100" />
        ))}
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" data-testid="activation-metrics-header">
      <MetricBox label="Total de canais" value={metrics.total} />
      <MetricBox label="Ativos" value={metrics.active} />
      <MetricBox label="Pendentes" value={metrics.pending} />
      <MetricBox
        label="Taxa de ativação"
        value={`${metrics.activationRate}%`}
        sub="Ativos / total"
      />
      <MetricBox
        label="Tempo médio ativação"
        value={formatAvg(metrics.avgActivationTimeMinutes)}
        sub="activatedAt − createdAt"
      />
    </div>
  );
}
