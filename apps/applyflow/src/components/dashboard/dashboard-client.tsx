"use client";

import { ApplyFlowBadge, type ApplyFlowBadgeTone } from "@/components/ui/ApplyFlowBadge";
import { ApplyFlowButton, applyFlowButtonClass } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import { ApplyFlowEmptyState } from "@/components/ui/ApplyFlowEmptyState";
import { ApplyFlowPrivacyNotice } from "@/components/ui/ApplyFlowPrivacyNotice";
import { ApplyFlowSection } from "@/components/ui/ApplyFlowSection";
import {
  APPLYFLOW_APPLICATION_STATUS_LABELS_PT,
  applyDashboardTableFilters,
  bucketApplicationsByWeek,
  collectDetectedSkills,
  computeApplicationMetrics,
  computeCreatedAtRange,
  FUNNEL_STATUS_ORDER,
  parseApplyFlowImportJsonString,
  type ApplyFlowApplication,
  type ApplyFlowApplicationStatus,
  type DashboardTableFilters,
} from "@devflow/applyflow-core";
import { useCallback, useEffect, useMemo, useState, startTransition } from "react";
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

import { DEMO_APPLICATIONS_PUBLIC_PATH } from "@/lib/demo-dataset";
import {
  clearPersistedDashboardImport,
  loadDashboardImport,
  persistDashboardImport,
} from "@/lib/local-import-storage";
import {
  buildInterviewLabCareerBundle,
  downloadCareerBundleJson,
  mapApplyFlowApplicationToCareer,
} from "@/lib/career-bundle-export";
import {
  copyCareerBundleJsonToClipboard,
  getInterviewLabImportHandoffUrl,
  stringifyCareerBundleJson,
} from "@/lib/interview-lab-handoff";
import { cn } from "@/lib/cn";
import { createCareerBundle, getInterviewReadyApplications } from "@devflow/career-core";

const CHART_COLORS = ["#34d399", "#2dd4bf", "#22d3ee", "#a78bfa", "#fb923c", "#f472b6", "#94a3b8"];

const CHART_TOOLTIP = {
  background: "rgba(24, 24, 27, 0.96)",
  border: "1px solid rgba(63, 63, 70, 0.85)",
  borderRadius: "8px",
} as const;

const defaultFilters: DashboardTableFilters = {
  period: "all",
  status: "all",
  skill: "",
  workModel: "all",
  contractType: "all",
  englishRequired: "all",
};

type FeedbackKind = "import" | "demo" | "restored";

type ImportFeedback = {
  loaded: number;
  ignored: number;
  kind: FeedbackKind;
};

function formatPct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function statusTone(status: ApplyFlowApplicationStatus): ApplyFlowBadgeTone {
  switch (status) {
    case "accepted":
      return "success";
    case "rejected":
    case "ignored":
      return "danger";
    case "interview":
      return "brand";
    case "technical_test":
      return "intel";
    case "waiting_response":
      return "warning";
    case "applied":
      return "neutral";
    default:
      return "neutral";
  }
}

const filterSelectClass = cn(
  "min-w-[130px] grow rounded-[var(--af-radius-sm)] border border-[color:var(--af-border-strong)]",
  "bg-[color:var(--af-bg-soft)] px-3 py-2.5 text-sm text-[color:var(--af-text)]",
  "focus:border-emerald-500/50 focus:outline-none",
);

function DashboardMetricCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <ApplyFlowCard variant="default" padding="md" className="shadow-sm ring-1 ring-white/[0.03]">
      <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--af-text-muted)]">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums text-[color:var(--af-text)]">{value}</p>
      {hint ? <p className="mt-1 text-[11px] leading-snug text-zinc-500">{hint}</p> : null}
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

function feedbackSummary(f: ImportFeedback | null): ReactNode {
  if (!f) return null;

  if (f.kind === "demo") {
    return (
      <>
        <strong className="text-emerald-300">Demo carregada</strong> com {f.loaded} candidaturas fictícias (apenas para
        demonstração).
        {f.ignored > 0 ? ` · ${f.ignored} linhas ignoradas` : null}
      </>
    );
  }
  if (f.kind === "import") {
    return (
      <>
        <strong className="text-emerald-300">Dados importados:</strong> {f.loaded} candidaturas
        {f.ignored > 0 ? ` · ${f.ignored} registos ignorados (formato inválido)` : null}
      </>
    );
  }
  return (
    <>
      <strong className="text-emerald-300">Dados restaurados</strong> deste navegador: {f.loaded} candidaturas.
    </>
  );
}

export function DashboardClient() {
  const [applications, setApplications] = useState<ApplyFlowApplication[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importFeedback, setImportFeedback] = useState<ImportFeedback | null>(null);
  const [filters, setFilters] = useState<DashboardTableFilters>(defaultFilters);
  const [dragOver, setDragOver] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  useEffect(() => {
    const stored = loadDashboardImport();
    startTransition(() => {
      if (stored?.applications?.length) {
        setApplications(stored.applications);
        setImportFeedback({
          loaded: stored.applications.length,
          ignored: 0,
          kind: "restored",
        });
      }
      setHydrated(true);
    });
  }, []);

  const now = useMemo(() => new Date(), []);

  const filtered = useMemo(
    () => applyDashboardTableFilters(applications, filters, now),
    [applications, filters, now],
  );

  const metrics = useMemo(() => computeApplicationMetrics(filtered, now), [filtered, now]);

  const careerExportPreview = useMemo(() => {
    const mapped = applications.map(mapApplyFlowApplicationToCareer);
    const temp = createCareerBundle(mapped);
    const interviewReady = getInterviewReadyApplications(temp);
    const bundle = buildInterviewLabCareerBundle(applications);
    return {
      exportRowCount: bundle.applications.length,
      interviewReadyInHistory: interviewReady.length,
    };
  }, [applications]);

  const [careerCopyFeedback, setCareerCopyFeedback] = useState<"idle" | "success" | "error">("idle");
  const [careerCopyMessage, setCareerCopyMessage] = useState<string | null>(null);

  const onCopyCareerBundleForInterviewLab = useCallback(async () => {
    setCareerCopyFeedback("idle");
    setCareerCopyMessage(null);
    const bundle = buildInterviewLabCareerBundle(applications);
    const json = stringifyCareerBundleJson(bundle);
    const r = await copyCareerBundleJsonToClipboard(json);
    if (r.ok) {
      setCareerCopyFeedback("success");
      window.setTimeout(() => setCareerCopyFeedback("idle"), 3200);
    } else {
      setCareerCopyFeedback("error");
      setCareerCopyMessage(r.error);
    }
  }, [applications]);

  const onOpenInterviewLabImport = useCallback(() => {
    window.open(getInterviewLabImportHandoffUrl(), "_blank", "noopener,noreferrer");
  }, []);

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
    const t = metrics.total;
    const yes = metrics.englishRequiredCount;
    return [
      { name: "Inglês exigido", count: yes },
      { name: "Não / não indicado", count: Math.max(0, t - yes) },
    ];
  }, [metrics.englishRequiredCount, metrics.total]);

  const skillsChart = useMemo(
    () => (metrics.skillsTop ?? []).slice(0, 8).map((x) => ({ name: x.skill, count: x.count })),
    [metrics.skillsTop],
  );

  const skillOptions = useMemo(() => collectDetectedSkills(applications), [applications]);

  const processJsonText = useCallback((text: string) => {
    setImportError(null);
    const r = parseApplyFlowImportJsonString(text);
    if (!r.ok) {
      setImportError(r.error);
      setImportFeedback(null);
      return;
    }
    setApplications(r.applications);
    persistDashboardImport(r.applications);
    setImportFeedback({
      loaded: r.applications.length,
      ignored: r.ignoredCount,
      kind: "import",
    });
    setImportError(null);
  }, []);

  const onFile = useCallback(
    (file: File | null) => {
      if (!file) return;
      void file.text().then((t) => processJsonText(t));
    },
    [processJsonText],
  );

  const loadDemo = useCallback(async () => {
    if (applications.length > 0) {
      const ok = window.confirm(
        "Já existem dados no dashboard. Substituir pelo conjunto de demonstração fictício?",
      );
      if (!ok) return;
    }
    setImportError(null);
    setDemoLoading(true);
    try {
      const res = await fetch(DEMO_APPLICATIONS_PUBLIC_PATH);
      if (!res.ok) {
        setImportError("Não foi possível carregar o ficheiro de demo (404 ou rede).");
        setImportFeedback(null);
        return;
      }
      const text = await res.text();
      const r = parseApplyFlowImportJsonString(text);
      if (!r.ok) {
        setImportError(r.error);
        setImportFeedback(null);
        return;
      }
      setApplications(r.applications);
      persistDashboardImport(r.applications);
      setImportFeedback({
        loaded: r.applications.length,
        ignored: r.ignoredCount,
        kind: "demo",
      });
      setFilters(defaultFilters);
    } catch {
      setImportError("Falha ao carregar a demo. Tente outra vez.");
      setImportFeedback(null);
    } finally {
      setDemoLoading(false);
    }
  }, [applications.length]);

  const hasData = applications.length > 0;
  const tableEmpty = hasData && filtered.length === 0;

  if (!hydrated) {
    return (
      <ApplyFlowCard variant="muted" padding="lg" className="text-center">
        <p className="text-sm text-[color:var(--af-text-muted)]">A preparar o painel e ler o armazenamento local…</p>
      </ApplyFlowCard>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10 overflow-x-hidden pb-12 sm:space-y-12">
      <ApplyFlowPrivacyNotice />

      <ApplyFlowSection
        id="como-importar"
        title="Dashboard"
        description="Importa um backup JSON da extensão (Opções › Histórico) ou carrega o conjunto de demo para explorar métricas sem dados reais. Com dados carregados, podes exportar um **CareerBundle** para o Interview Lab (JSON local). Tudo é processado neste dispositivo."
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-stretch">
          <ApplyFlowCard
            variant="muted"
            padding="lg"
            className={cn(
              "grow border-dashed transition-colors sm:min-w-[220px]",
              dragOver ? "border-emerald-500/55 bg-emerald-950/20" : "border-[color:var(--af-border-strong)]",
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files[0];
              onFile(f ?? null);
            }}
          >
            <div className="text-center">
              <input
                id="af-json"
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => onFile(e.target.files?.[0] ?? null)}
              />
              <label
                htmlFor="af-json"
                className={applyFlowButtonClass({
                  variant: "primary",
                  size: "md",
                  className: "cursor-pointer",
                })}
              >
                Importar JSON
              </label>
              <p className="mt-3 text-xs text-[color:var(--af-text-muted)]">
                Arrasta um ficheiro para aqui — processado só no teu dispositivo.
              </p>
            </div>
          </ApplyFlowCard>

          <div id="carregar-demo" className="flex scroll-mt-24 flex-col items-stretch justify-center gap-2 sm:w-auto">
            <ApplyFlowButton
              type="button"
              variant="outlineBrand"
              size="md"
              disabled={demoLoading}
              className="w-full min-w-[180px] sm:w-auto"
              onClick={() => void loadDemo()}
            >
              {demoLoading ? "A carregar demo…" : "Carregar demo"}
            </ApplyFlowButton>
            <p className="text-center text-[11px] text-[color:var(--af-text-muted)] sm:text-left">
              ~20 vagas fictícias · sem PII
            </p>
          </div>
        </div>

        {importError ? (
          <ApplyFlowCard variant="danger" padding="md" role="alert">
            <p className="font-medium text-red-200">Não foi possível usar este ficheiro</p>
            <p className="mt-1 text-sm text-red-100/90">{importError}</p>
            <p className="mt-3 text-xs text-red-200/85">
              Confirma que exportaste o backup a partir da extensão ou experimenta a <strong>demo</strong> para ver o painel
              com dados fictícios.
            </p>
          </ApplyFlowCard>
        ) : null}

        {!hasData && !importError ? (
          <ApplyFlowEmptyState
            title="Nenhum dado carregado"
            description={
              <>
                Importa o JSON gerado na extensão (Opções › Histórico) ou usa <strong>Carregar demo</strong> para ver funil,
                gráficos e tabela com dados fictícios — ideal para portefólio ou ensaio sem PII.
              </>
            }
            primaryLabel="Ir para importar ou demo"
            onPrimary={() => document.getElementById("como-importar")?.scrollIntoView({ behavior: "smooth", block: "start" })}
          />
        ) : null}

        {importFeedback && hasData ? (
          <ApplyFlowCard variant="success" padding="md" className="text-sm text-emerald-100/95">
            {feedbackSummary(importFeedback)}
            {importFeedback.kind !== "demo"
              ? (() => {
                  const r = computeCreatedAtRange(applications);
                  if (!r.oldest || !r.newest) return null;
                  return (
                    <span className="mt-1 block text-xs text-emerald-200/75">
                      Período (criação): {new Date(r.oldest).toLocaleDateString("pt-BR")} —{" "}
                      {new Date(r.newest).toLocaleDateString("pt-BR")}
                    </span>
                  );
                })()
              : null}
            {importFeedback.kind === "demo" ? (
              <span className="mt-1 block text-xs text-emerald-200/70">
                Empresas e vagas são inteiramente fictícias (demonstração de portefólio).
              </span>
            ) : null}
          </ApplyFlowCard>
        ) : null}

        {hasData ? (
          <ApplyFlowCard variant="muted" padding="md" className="border border-[color:var(--af-border-strong)]/80">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-xl space-y-2">
                <h3 className="text-sm font-semibold text-[color:var(--af-text)]">Interview Lab · exportação local</h3>
                <p className="text-xs leading-relaxed text-[color:var(--af-text-muted)]">
                  <span className="text-[color:var(--af-text)]">
                    Export your selected applications as a CareerBundle and import them into Interview Lab for
                    role-specific interview practice.
                  </span>{" "}
                  O ficheiro JSON é gerado <strong className="text-[color:var(--af-text)]">só neste browser</strong>{" "}
                  (sem upload para servidores ApplyFlow ou Interview Lab).
                </p>
                <p className="text-[11px] leading-snug text-zinc-500">
                  Este export usa as candidaturas carregadas no dashboard (histórico importado ou demo), com regras de
                  prioridade do <code className="rounded bg-zinc-800/80 px-1 py-0.5 text-zinc-300">@devflow/career-core</code>{" "}
                  (entrevista → aplicadas/revisão → restantes).
                </p>
                <p className="text-[11px] leading-snug text-zinc-500">
                  <strong className="font-medium text-zinc-400">Handoff rápido:</strong>{" "}
                  <span className="text-zinc-500">Copy CareerBundle</span> copia o mesmo JSON para o clipboard;{" "}
                  <span className="text-zinc-500">Open Interview Lab</span> abre o import no Interview Lab (nova aba). Sem dados na
                  URL — continua local-first.
                </p>
                {careerExportPreview.interviewReadyInHistory === 0 ? (
                  <ApplyFlowCard variant="warning" padding="sm" className="text-xs text-amber-100/95">
                    <strong className="font-medium text-amber-100">Sem vagas em fase de entrevista</strong> neste
                    conjunto (mapeadas como &quot;interview requested&quot; / &quot;scheduled&quot;). O export continua
                    disponível e incluirá candidaturas em <strong>applied</strong>/<strong>saved</strong> ou o conjunto
                    completo, conforme as regras do bundle.
                  </ApplyFlowCard>
                ) : (
                  <p className="text-[11px] text-emerald-200/80">
                    {careerExportPreview.interviewReadyInHistory} candidatura(s) mapeada(s) para fase de entrevista no
                    histórico actual — o export prioriza essas linhas.
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                  <ApplyFlowButton
                    type="button"
                    variant="outlineBrand"
                    size="md"
                    className="font-medium"
                    disabled={careerExportPreview.exportRowCount === 0}
                    onClick={() => void onCopyCareerBundleForInterviewLab()}
                  >
                    Copy CareerBundle
                  </ApplyFlowButton>
                  <ApplyFlowButton type="button" variant="outlineBrand" size="md" className="font-medium" onClick={onOpenInterviewLabImport}>
                    Open Interview Lab
                  </ApplyFlowButton>
                  <ApplyFlowButton
                    type="button"
                    variant="outlineBrand"
                    size="md"
                    className="font-medium"
                    disabled={careerExportPreview.exportRowCount === 0}
                    onClick={() => {
                      const bundle = buildInterviewLabCareerBundle(applications);
                      downloadCareerBundleJson(bundle);
                    }}
                  >
                    Exportar para Interview Lab
                  </ApplyFlowButton>
                </div>
                {careerCopyFeedback === "success" ? (
                  <p className="text-center text-[11px] font-medium text-emerald-300 sm:text-right">CareerBundle copied.</p>
                ) : null}
                {careerCopyFeedback === "error" && careerCopyMessage ? (
                  <p className="max-w-xs text-center text-[11px] leading-snug text-amber-200/95 sm:text-right">{careerCopyMessage}</p>
                ) : null}
                <span className="text-center text-[10px] text-[color:var(--af-text-muted)] sm:text-right">
                  ~{careerExportPreview.exportRowCount} vaga(s) no JSON
                </span>
              </div>
            </div>
          </ApplyFlowCard>
        ) : null}

        {hasData ? (
          <div className="flex flex-wrap items-center gap-4">
            <ApplyFlowButton
              type="button"
              variant="dangerGhost"
              size="sm"
              className="px-0 py-0 font-medium"
              onClick={() => {
                clearPersistedDashboardImport();
                setApplications([]);
                setImportFeedback(null);
                setImportError(null);
                setFilters(defaultFilters);
              }}
            >
              Limpar dados do navegador
            </ApplyFlowButton>
          </div>
        ) : null}
      </ApplyFlowSection>

      {hasData ? (
        <>
          <ApplyFlowSection
            title="Resumo numérico"
            description={
              <>
                Valores refletem os <strong>filtros ativos</strong> abaixo (período, estado, skills, etc.).
              </>
            }
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
            <h2 className="text-lg font-semibold text-[color:var(--af-text)] sm:text-xl">Visualizações</h2>
            <p className="mt-1 max-w-2xl text-xs text-[color:var(--af-text-muted)] sm:text-sm">
              Gráficos baseados na mesma lista filtrada que a tabela.
            </p>
            <div className="mt-4 grid gap-4 sm:mt-6 sm:gap-5 lg:grid-cols-2">
              <ChartPanel title="Funil por estado" hint="Distribuição das candidaturas visíveis por fase do processo.">
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
                hint="Extraídas do jobMeta das candidaturas filtradas (heurística da extensão)."
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

          <ApplyFlowSection
            title="Tabela de candidaturas"
            description="Filtra por período e critérios; em ecrãs pequenos usa scroll horizontal na grelha."
          >
            <ApplyFlowCard variant="muted" padding="md" className="flex flex-wrap gap-2 sm:gap-3">
              <select
                className={cn(filterSelectClass, "sm:max-w-[200px]")}
                value={filters.period}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, period: e.target.value as DashboardTableFilters["period"] }))
                }
              >
                <option value="all">Período: todos</option>
                <option value="7d">Últimos 7 dias</option>
                <option value="30d">Últimos 30 dias</option>
                <option value="90d">Últimos 90 dias</option>
              </select>
              <select
                className={cn(filterSelectClass, "sm:max-w-[220px]")}
                value={filters.status}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, status: e.target.value as DashboardTableFilters["status"] }))
                }
              >
                <option value="all">Estado: todos</option>
                {(Object.keys(APPLYFLOW_APPLICATION_STATUS_LABELS_PT) as ApplyFlowApplicationStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {APPLYFLOW_APPLICATION_STATUS_LABELS_PT[s]}
                  </option>
                ))}
              </select>
              <select
                className={cn(filterSelectClass, "sm:max-w-[180px]")}
                value={filters.skill}
                onChange={(e) => setFilters((f) => ({ ...f, skill: e.target.value }))}
              >
                <option value="">Skill: todas</option>
                {skillOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <select
                className={filterSelectClass}
                value={filters.workModel}
                onChange={(e) => setFilters((f) => ({ ...f, workModel: e.target.value }))}
              >
                <option value="all">Modelo: todos</option>
                <option value="remote">Remoto</option>
                <option value="hybrid">Híbrido</option>
                <option value="onsite">Presencial</option>
                <option value="unknown">Desconhecido</option>
              </select>
              <select
                className={filterSelectClass}
                value={filters.contractType}
                onChange={(e) => setFilters((f) => ({ ...f, contractType: e.target.value }))}
              >
                <option value="all">Contrato: todos</option>
                <option value="clt">CLT</option>
                <option value="pj">PJ</option>
                <option value="contractor">Contractor</option>
                <option value="internship">Estágio</option>
                <option value="unknown">Desconhecido</option>
              </select>
              <select
                className={filterSelectClass}
                value={filters.englishRequired}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    englishRequired: e.target.value as DashboardTableFilters["englishRequired"],
                  }))
                }
              >
                <option value="all">Inglês: todos</option>
                <option value="yes">Exigido (sim)</option>
                <option value="no">Não / não indicado</option>
              </select>
            </ApplyFlowCard>

            {tableEmpty ? (
              <ApplyFlowEmptyState
                variant="warning"
                title="Nenhum resultado para os filtros atuais"
                description="Alarga o período, limpa a skill ou escolhe «todos» nos selects. Os dados importados continuam guardados neste navegador."
                primaryLabel="Repor filtros"
                onPrimary={() => setFilters(defaultFilters)}
              />
            ) : null}

            <div className="-mx-4 overflow-x-auto rounded-[var(--af-radius)] border border-[color:var(--af-border)] sm:mx-0">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="border-b border-[color:var(--af-border)] bg-[color:var(--af-bg-soft)] text-[11px] uppercase tracking-wide text-[color:var(--af-text-muted)] sm:text-xs">
                  <tr>
                    <th className="whitespace-nowrap px-3 py-3.5">Data</th>
                    <th className="px-3 py-3.5">Empresa</th>
                    <th className="px-3 py-3.5">Vaga</th>
                    <th className="px-3 py-3.5">Estado</th>
                    <th className="px-3 py-3.5">Fit</th>
                    <th className="px-3 py-3.5">Senioridade</th>
                    <th className="px-3 py-3.5">Tipo</th>
                    <th className="px-3 py-3.5">Modelo</th>
                    <th className="px-3 py-3.5">Contrato</th>
                    <th className="px-3 py-3.5">Inglês</th>
                    <th className="px-3 py-3.5">Skills</th>
                    <th className="px-3 py-3.5">Notas</th>
                    <th className="px-3 py-3.5">Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--af-border)]">
                  {filtered.map((a) => (
                    <tr
                      key={a.id}
                      className="bg-[color:var(--af-bg)]/80 transition-colors hover:bg-[color:var(--af-surface-muted)]"
                    >
                      <td className="whitespace-nowrap px-3 py-3 text-[color:var(--af-text-muted)]">
                        {new Date(a.createdAt).toLocaleDateString("pt-BR")}
                      </td>
                      <td
                        className="max-w-[130px] truncate px-3 py-3 text-[color:var(--af-text)] sm:max-w-[160px]"
                        title={a.companyName}
                      >
                        {a.companyName ?? "—"}
                      </td>
                      <td
                        className="max-w-[150px] truncate px-3 py-3 font-medium text-[color:var(--af-text)] sm:max-w-[180px]"
                        title={a.jobTitle}
                      >
                        {a.jobTitle ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        <ApplyFlowBadge tone={statusTone(a.status)}>
                          {APPLYFLOW_APPLICATION_STATUS_LABELS_PT[a.status]}
                        </ApplyFlowBadge>
                      </td>
                      <td className="px-3 py-3 tabular-nums text-[color:var(--af-text-muted)]">{a.fitScore ?? "—"}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-[color:var(--af-text-muted)]">
                        {a.jobMeta?.seniority ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-[color:var(--af-text-muted)]">
                        {a.jobMeta?.roleType ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-[color:var(--af-text-muted)]">
                        {a.jobMeta?.workModel ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-[color:var(--af-text-muted)]">
                        {a.jobMeta?.contractType ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-[color:var(--af-text-muted)]">
                        {a.jobMeta?.englishRequired === true ? "sim" : a.jobMeta?.englishRequired === false ? "não" : "—"}
                      </td>
                      <td
                        className="max-w-[160px] truncate px-3 py-3 text-[color:var(--af-text-muted)] sm:max-w-[200px]"
                        title={(a.jobMeta?.detectedSkills ?? []).join(", ")}
                      >
                        {(a.jobMeta?.detectedSkills ?? []).slice(0, 4).join(", ") || "—"}
                      </td>
                      <td
                        className="max-w-[120px] truncate px-3 py-3 text-[color:var(--af-text-muted)] sm:max-w-[160px]"
                        title={a.notes}
                      >
                        {a.notes ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        {a.jobUrl ? (
                          <a
                            href={a.jobUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-emerald-400 hover:text-emerald-300 hover:underline"
                          >
                            abrir
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ApplyFlowSection>
        </>
      ) : null}
    </div>
  );
}
