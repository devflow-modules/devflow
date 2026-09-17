"use client";

import {
  APPLYFLOW_APPLICATION_STATUS_LABELS_PT,
  applyDashboardTableFilters,
  bucketApplicationsByWeek,
  computeApplicationMetrics,
  FUNNEL_STATUS_ORDER,
  type ApplyFlowApplication,
  type DashboardTableFilters,
} from "@devflow/applyflow-core";
import { useMemo } from "react";
import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import { ApplyFlowSection } from "@/components/ui/ApplyFlowSection";

const CHART_COLORS = ["#34d399", "#2dd4bf", "#22d3ee", "#a78bfa", "#fb923c", "#f472b6", "#94a3b8"];

const CHART_TOOLTIP = {
  background: "rgba(24, 24, 27, 0.96)",
  border: "1px solid rgba(63, 63, 70, 0.85)",
  borderRadius: "8px",
} as const;

const HISTORY_FILTERS: DashboardTableFilters = {
  period: "all",
  status: "all",
  skill: "",
  workModel: "all",
  contractType: "all",
  englishRequired: "all",
};

function formatPct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function DashboardMetricCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <ApplyFlowCard variant="default" padding="md" className="shadow-sm ring-1 ring-white/[0.03]">
      <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--af-text-muted)]">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums text-[color:var(--af-text)]">{value}</p>
      {hint ? <p className="mt-1 text-[11px] leading-snug text-[color:var(--af-text-muted)]">{hint}</p> : null}
    </ApplyFlowCard>
  );
}

function ChartPanel({
  title,
  hint,
  tall,
  children,
}: {
  title: string;
  hint: string;
  tall?: boolean;
  children: ReactNode;
}) {
  return (
    <ApplyFlowCard variant="muted" padding="md">
      <h3 className="text-sm font-semibold text-[color:var(--af-text)]">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-[color:var(--af-text-muted)]">{hint}</p>
      <div className={tall ? "mt-4 h-56 min-h-[14rem] sm:h-60" : "mt-4 h-64 min-h-[16rem]"}>{children}</div>
    </ApplyFlowCard>
  );
}

export function DashboardHistoryCharts({ applications }: { applications: ApplyFlowApplication[] }) {
  const now = useMemo(() => new Date(), []);
  const filtered = useMemo(
    () => applyDashboardTableFilters(applications, HISTORY_FILTERS, now),
    [applications, now],
  );
  const metrics = useMemo(() => computeApplicationMetrics(filtered, now), [filtered, now]);

  const funnelData = useMemo(
    () =>
      FUNNEL_STATUS_ORDER.map((status) => ({
        name: APPLYFLOW_APPLICATION_STATUS_LABELS_PT[status],
        key: status,
        count: metrics.byStatus[status] ?? 0,
      })).filter((d) => d.count > 0),
    [metrics.byStatus],
  );

  const weekBuckets = useMemo(() => bucketApplicationsByWeek(filtered), [filtered]);

  const workChart = useMemo(
    () =>
      Object.entries(metrics.byWorkModel).map(([name, count]) => ({
        name: name === "unknown" ? "desconhecido" : name,
        count,
      })),
    [metrics.byWorkModel],
  );

  const contractChart = useMemo(
    () =>
      Object.entries(metrics.byContractType).map(([name, count]) => ({
        name: name === "unknown" ? "desconhecido" : name,
        count,
      })),
    [metrics.byContractType],
  );

  const englishChart = useMemo(() => {
    const total = metrics.total;
    const yes = metrics.englishRequiredCount;
    return [
      { name: "Inglês exigido", count: yes },
      { name: "Não / não indicado", count: Math.max(0, total - yes) },
    ];
  }, [metrics.englishRequiredCount, metrics.total]);

  const skillsChart = useMemo(
    () => (metrics.skillsTop ?? []).slice(0, 8).map((x) => ({ name: x.skill, count: x.count })),
    [metrics.skillsTop],
  );

  if (applications.length === 0) {
    return (
      <ApplyFlowCard variant="muted" padding="md" className="mt-4">
        <p className="text-sm text-[color:var(--af-text-muted)]">
          Ainda não há candidaturas registadas para o histórico por estado, semana e skills.
        </p>
      </ApplyFlowCard>
    );
  }

  return (
    <div className="mt-4 grid gap-6">
      <ApplyFlowSection
        title="Resumo numérico"
        description="Contagens só de candidaturas registadas — vagas salvas não entram aqui."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <DashboardMetricCard label="Total visível" value={metrics.total} hint="Candidaturas após filtros" />
          <DashboardMetricCard label="Aplicadas" value={metrics.byStatus.applied ?? 0} />
          <DashboardMetricCard label="Aguardando resposta" value={metrics.byStatus.waiting_response ?? 0} />
          <DashboardMetricCard label="Entrevistas" value={metrics.byStatus.interview ?? 0} />
          <DashboardMetricCard label="Testes técnicos" value={metrics.byStatus.technical_test ?? 0} />
          <DashboardMetricCard label="Recusadas" value={metrics.byStatus.rejected ?? 0} />
          <DashboardMetricCard label="Aprovadas" value={metrics.byStatus.accepted ?? 0} />
          <DashboardMetricCard
            label="Taxa de entrevista"
            value={formatPct(metrics.interviewRate)}
            hint="Entrevistas ÷ total visível"
          />
          <DashboardMetricCard
            label="Paradas 7+ dias"
            value={metrics.staleCount}
            hint="Revisão / aplicada / aguardando sem actualização há 7+ dias"
          />
          <DashboardMetricCard
            label="Média de fit"
            value={metrics.averageFitScore ?? "—"}
            hint="Só entradas com fit numérico"
          />
        </div>
      </ApplyFlowSection>

      <section>
        <h3 className="text-lg font-semibold text-[color:var(--af-text)] sm:text-xl">Visualizações</h3>
        <p className="mt-1 max-w-2xl text-xs text-[color:var(--af-text-muted)] sm:text-sm">
          Funil V1, semana de calendário, skills e atributos do anúncio. O funil Career OS está no separador Funnel.
        </p>
        <div className="mt-4 grid gap-4 sm:mt-6 sm:gap-5 lg:grid-cols-2">
          <ChartPanel title="Funil por estado" hint="Distribuição das candidaturas registadas por fase do processo.">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(63,63,70,0.6)" />
                <XAxis type="number" stroke="#71717a" />
                <YAxis type="category" dataKey="name" width={118} stroke="#71717a" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={CHART_TOOLTIP} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {funnelData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartPanel>

          <ChartPanel
            title="Novas candidaturas por semana"
            hint="Contagem por semana de calendário (data de criação do registo)."
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekBuckets}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(63,63,70,0.6)" />
                <XAxis dataKey="label" stroke="#71717a" tick={{ fontSize: 10 }} />
                <YAxis stroke="#71717a" allowDecimals={false} />
                <Tooltip contentStyle={CHART_TOOLTIP} />
                <Bar dataKey="count" fill="#34d399" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartPanel>

          <ChartPanel
            title="Skills mais frequentes"
            hint="Extraídas do jobMeta das candidaturas (heurística da extensão)."
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={skillsChart} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(63,63,70,0.6)" />
                <XAxis type="number" stroke="#71717a" />
                <YAxis type="category" dataKey="name" width={96} stroke="#71717a" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={CHART_TOOLTIP} />
                <Bar dataKey="count" fill="#2dd4bf" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartPanel>

          <ChartPanel title="Modelo de trabalho" hint="Remoto, híbrido, presencial ou desconhecido." tall>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={workChart} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={72} label>
                  {workChart.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Tooltip contentStyle={CHART_TOOLTIP} />
              </PieChart>
            </ResponsiveContainer>
          </ChartPanel>

          <ChartPanel title="Tipo de contratação" hint="CLT, PJ, contractor, estágio, etc." tall>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={contractChart} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={72} label>
                  {contractChart.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[(i + 2) % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Tooltip contentStyle={CHART_TOOLTIP} />
              </PieChart>
            </ResponsiveContainer>
          </ChartPanel>

          <ChartPanel
            title="Inglês exigido no anúncio"
            hint="Com base na meta heurística; «não indicado» inclui anúncios sem menção clara."
            tall
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={englishChart} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={72} label>
                  {englishChart.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[(i + 4) % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Tooltip contentStyle={CHART_TOOLTIP} />
              </PieChart>
            </ResponsiveContainer>
          </ChartPanel>
        </div>
      </section>
    </div>
  );
}
