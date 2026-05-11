import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  computeApplicationMetrics,
  getApplicationsByPeriod,
  type ApplicationsPeriodFilter,
  isApplicationStale7d,
} from "../../storage/application-metrics.js";
import {
  JOB_CONTRACT_LABEL_PT,
  JOB_ROLE_LABEL_PT,
  JOB_SENIORITY_LABEL_PT,
  JOB_WORK_MODEL_LABEL_PT,
} from "../../panel/job-meta-i18n.js";
import {
  APPLYFLOW_APPLICATION_STATUS_LABELS_PT,
  type ApplyFlowApplication,
  type ApplyFlowApplicationStatus,
  type ApplyFlowJobMeta,
  clearApplications,
  deleteApplication,
  getApplications,
  updateApplicationNotes,
  updateApplicationStatus,
} from "../../storage/application-storage.js";
import { applicationsToCsv, applicationsToJson } from "../../storage/application-history-export.js";

const PERIOD_LABELS: Record<ApplicationsPeriodFilter, string> = {
  all: "Todos os períodos",
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
  "90d": "Últimos 90 dias",
};

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function formatPercent(rate: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 }).format(rate);
}

function summarizeBuckets(counts: Record<string, number>, labels: Record<string, string>): string {
  const parts = Object.entries(counts)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${labels[k] ?? k}: ${n}`);
  return parts.length ? parts.join(" · ") : "—";
}

function JobMetaCell({ meta }: { meta?: ApplyFlowJobMeta }) {
  if (!meta) return <span className="af-muted">—</span>;

  const chips: ReactNode[] = [];
  if (meta.seniority && meta.seniority !== "unknown") {
    chips.push(
      <span key="sen" className="af-intel-chip">
        {JOB_SENIORITY_LABEL_PT[meta.seniority] ?? meta.seniority}
      </span>,
    );
  }
  if (meta.roleType && meta.roleType !== "unknown") {
    chips.push(
      <span key="role" className="af-intel-chip">
        {JOB_ROLE_LABEL_PT[meta.roleType] ?? meta.roleType}
      </span>,
    );
  }
  if (meta.workModel && meta.workModel !== "unknown") {
    chips.push(
      <span key="wm" className="af-intel-chip">
        {JOB_WORK_MODEL_LABEL_PT[meta.workModel] ?? meta.workModel}
      </span>,
    );
  }
  if (meta.contractType && meta.contractType !== "unknown") {
    chips.push(
      <span key="ct" className="af-intel-chip">
        {JOB_CONTRACT_LABEL_PT[meta.contractType] ?? meta.contractType}
      </span>,
    );
  }
  chips.push(
    <span key="en" className="af-intel-chip">
      EN {meta.englishRequired === true ? "✓" : meta.englishRequired === false ? "✗" : "—"}
    </span>,
  );

  const skills = (meta.detectedSkills ?? []).slice(0, 6);
  for (const sk of skills) {
    chips.push(
      <span key={`sk-${sk}`} className="af-intel-chip af-intel-chip-skill">
        {sk}
      </span>,
    );
  }

  return <div className="af-intel-wrap">{chips}</div>;
}

export function ApplicationsHistoryPanel() {
  const [records, setRecords] = useState<ApplyFlowApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState<ApplicationsPeriodFilter>("all");
  const [filterStatus, setFilterStatus] = useState<ApplyFlowApplicationStatus | "all">("all");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const refresh = useCallback(async () => {
    setErr("");
    try {
      const list = await getApplications();
      setRecords(list);
    } catch {
      setErr("Não foi possível ler o histórico local.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const periodFiltered = useMemo(
    () => getApplicationsByPeriod(records, filterPeriod, new Date()),
    [records, filterPeriod],
  );

  const visibleRows = useMemo(() => {
    if (filterStatus === "all") return periodFiltered;
    return periodFiltered.filter((r) => r.status === filterStatus);
  }, [periodFiltered, filterStatus]);

  const metrics = useMemo(() => computeApplicationMetrics(visibleRows, new Date()), [visibleRows]);

  async function onStatusChange(id: string, status: ApplyFlowApplicationStatus) {
    setErr("");
    const res = await updateApplicationStatus(id, status);
    if (!res) {
      setErr("Registo não encontrado.");
      void refresh();
      return;
    }
    void refresh();
  }

  async function onNotesBlur(id: string, notes: string) {
    setErr("");
    await updateApplicationNotes(id, notes);
    void refresh();
  }

  async function onDelete(id: string) {
    if (!confirm("Remover esta entrada do histórico local?")) return;
    setErr("");
    await deleteApplication(id);
    setMsg("Entrada removida.");
    window.setTimeout(() => setMsg(""), 2400);
    void refresh();
  }

  async function onClearAll() {
    if (!confirm("Limpar todo o histórico de candidaturas neste dispositivo?")) return;
    setErr("");
    await clearApplications();
    setMsg("Histórico limpo.");
    window.setTimeout(() => setMsg(""), 2400);
    void refresh();
  }

  function download(name: string, contents: string, mime: string) {
    const blob = new Blob([contents], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleExportCsvFiltered() {
    setErr("");
    download(
      `applyflow-applications-filtro.csv`,
      applicationsToCsv(visibleRows),
      "text/csv;charset=utf-8",
    );
    setMsg(`CSV exportado com ${visibleRows.length} registo(s) visíveis (período + estado).`);
    window.setTimeout(() => setMsg(""), 4800);
  }

  function handleExportJsonFiltered() {
    setErr("");
    download(
      `applyflow-applications-filtro.json`,
      applicationsToJson(visibleRows),
      "application/json;charset=utf-8",
    );
    setMsg(`JSON exportado (${visibleRows.length} registo(s)) — apenas o subset visível pelo filtro.`);
    window.setTimeout(() => setMsg(""), 4800);
  }

  async function handleExportJsonFull() {
    setErr("");
    const list = await getApplications();
    download("applyflow-applications-backup-completo.json", applicationsToJson(list), "application/json;charset=utf-8");
    setMsg(`Backup JSON completo (${list.length} registo(s) no armazenamento).`);
    window.setTimeout(() => setMsg(""), 4800);
  }

  if (loading) {
    return <p className="af-muted">A carregar histórico…</p>;
  }

  const filterExplain =
    filterPeriod === "all" && filterStatus === "all"
      ? "sem filtro restritivo"
      : `${PERIOD_LABELS[filterPeriod].toLowerCase()}${filterStatus === "all" ? "" : ` · estado «${APPLYFLOW_APPLICATION_STATUS_LABELS_PT[filterStatus]}»`}`;

  return (
    <div className="af-history-wrap">
      <p className="af-opt-intro" style={{ marginBottom: "16px" }}>
        Histórico guardado só neste browser (chrome.storage.local). Não inclui respostas do formulário, carta de apresentação
        completa, salário preenchido nem texto integral da vaga. Métricas e funil são <strong>cálculos locais</strong> sobre este
        dataset (sem servidor).
      </p>

      <section aria-label="Métricas do funil">
        <p className="af-muted" style={{ marginBottom: "8px", fontSize: "12px" }}>
          Métricas alinhadas aos filtros (<strong>{PERIOD_LABELS[filterPeriod]}</strong>
          {filterStatus === "all" ? "" : (
            <>
              {" "}
              · estado <strong>{APPLYFLOW_APPLICATION_STATUS_LABELS_PT[filterStatus]}</strong>
            </>
          )}
          )
          {metrics.averageFitScore != null ? (
            <>
              {" "}
              · Fit médio: <strong>{metrics.averageFitScore}</strong> (entre entradas com score)
            </>
          ) : null}
        </p>
        <div className="af-metrics-grid">
          <article className="af-metric-card">
            <p className="af-metric-value">{metrics.total}</p>
            <p className="af-metric-label">Total (visível)</p>
          </article>
          <article className="af-metric-card">
            <p className="af-metric-value">{metrics.last7Days}</p>
            <p className="af-metric-label">Criadas nos últimos 7 dias (subconjunto actual)</p>
          </article>
          <article className="af-metric-card">
            <p className="af-metric-value">{metrics.byStatus.waiting_response ?? 0}</p>
            <p className="af-metric-label">Aguardando resposta</p>
          </article>
          <article className="af-metric-card">
            <p className="af-metric-value">{metrics.byStatus.interview ?? 0}</p>
            <p className="af-metric-label">Entrevistas</p>
          </article>
          <article className="af-metric-card">
            <p className="af-metric-value">{metrics.byStatus.technical_test ?? 0}</p>
            <p className="af-metric-label">Testes técnicos</p>
          </article>
          <article className="af-metric-card">
            <p className="af-metric-value">{metrics.byStatus.rejected ?? 0}</p>
            <p className="af-metric-label">Recusadas</p>
          </article>
          <article className="af-metric-card">
            <p className="af-metric-value">{formatPercent(metrics.interviewRate)}</p>
            <p className="af-metric-label">Taxa de entrevista (entre entrevistas / total visível)</p>
          </article>
          <article className="af-metric-card">
            <p className="af-metric-value">{metrics.staleCount}</p>
            <p className="af-metric-label">Paradas 7+ dias (rev./aplic./aguardam)</p>
          </article>
        </div>
      </section>

      <section aria-label="Inteligência agregada (jobMeta)" style={{ marginBottom: "18px" }}>
        <p className="af-muted" style={{ marginBottom: "8px", fontSize: "12px" }}>
          Dados de <strong>job intelligence</strong> já persistidos em cada registo (sem texto bruto da vaga).
        </p>
        <div className="af-metrics-grid">
          <article className="af-metric-card">
            <p className="af-metric-value">{metrics.englishRequiredCount}</p>
            <p className="af-metric-label">Inglês exigido (jobMeta)</p>
          </article>
          <article className="af-metric-card" style={{ gridColumn: "span 2" }}>
            <p className="af-metric-value" style={{ fontSize: "13px", fontWeight: 600, lineHeight: 1.35 }}>
              {metrics.skillsTop?.length
                ? metrics.skillsTop.map((x) => `${x.skill} (${x.count})`).join(" · ")
                : "—"}
            </p>
            <p className="af-metric-label">Top skills (contagem no filtro)</p>
          </article>
          <article className="af-metric-card" style={{ gridColumn: "span 2" }}>
            <p className="af-metric-value" style={{ fontSize: "12px", fontWeight: 600, lineHeight: 1.35 }}>
              {summarizeBuckets(metrics.byWorkModel, JOB_WORK_MODEL_LABEL_PT)}
            </p>
            <p className="af-metric-label">Modelo de trabalho</p>
          </article>
          <article className="af-metric-card" style={{ gridColumn: "span 2" }}>
            <p className="af-metric-value" style={{ fontSize: "12px", fontWeight: 600, lineHeight: 1.35 }}>
              {summarizeBuckets(metrics.byContractType, JOB_CONTRACT_LABEL_PT)}
            </p>
            <p className="af-metric-label">Contratação</p>
          </article>
          <article className="af-metric-card" style={{ gridColumn: "span 2" }}>
            <p className="af-metric-value" style={{ fontSize: "12px", fontWeight: 600, lineHeight: 1.35 }}>
              {summarizeBuckets(metrics.byRoleType, JOB_ROLE_LABEL_PT)}
            </p>
            <p className="af-metric-label">Tipo de papel</p>
          </article>
        </div>
      </section>

      <div className="af-history-toolbar">
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px 20px", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label className="af-muted" htmlFor="af-history-period" style={{ fontSize: "12px" }}>
              Período
            </label>
            <select
              id="af-history-period"
              className="af-input"
              style={{ width: "200px", maxWidth: "100%" }}
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value as ApplicationsPeriodFilter)}
            >
              {(Object.entries(PERIOD_LABELS) as [ApplicationsPeriodFilter, string][]).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label className="af-muted" htmlFor="af-history-status" style={{ fontSize: "12px" }}>
              Estado
            </label>
            <select
              id="af-history-status"
              className="af-input"
              style={{ width: "200px", maxWidth: "100%" }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as ApplyFlowApplicationStatus | "all")}
            >
              <option value="all">Todos</option>
              {(Object.entries(APPLYFLOW_APPLICATION_STATUS_LABELS_PT) as [ApplyFlowApplicationStatus, string][]).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ),
              )}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", marginTop: "14px" }}>
          <button type="button" className="af-opt-btn-secondary" style={{ width: "auto" }} onClick={() => handleExportCsvFiltered()}>
            Exportar CSV (filtro)
          </button>
          <button type="button" className="af-opt-btn-secondary" style={{ width: "auto" }} onClick={() => handleExportJsonFiltered()}>
            Exportar JSON (filtro)
          </button>
          <button type="button" className="af-opt-btn-secondary" style={{ width: "auto" }} onClick={() => void handleExportJsonFull()}>
            Backup JSON completo
          </button>
          <button type="button" className="af-opt-btn-secondary" style={{ width: "auto" }} onClick={() => void onClearAll()}>
            Limpar histórico
          </button>
        </div>
      </div>

      <p className="af-export-hint">
        CSV e JSON marcados como «filtro» usam apenas a tabela actual ({visibleRows.length} linha(s) —{" "}
        {filterExplain}).
      </p>

      <div className="af-opt-feedback" style={{ marginTop: "12px" }}>
        {msg ? <span className="af-opt-ok">{msg}</span> : null}
        {err ? <span className="af-opt-err">{err}</span> : null}
      </div>

      <div className="af-history-table-wrap">
        <table className="af-history-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Empresa</th>
              <th>Vaga</th>
              <th>Intel</th>
              <th>Estado</th>
              <th>Fit</th>
              <th>Campos</th>
              <th>Falhas / bloq.</th>
              <th>Link</th>
              <th>Notas</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 ? (
              <tr>
                <td colSpan={11} className="af-muted" style={{ padding: "16px" }}>
                  Nenhum registo para {filterExplain}.
                </td>
              </tr>
            ) : (
              visibleRows.map((r) => {
                const stale = isApplicationStale7d(r, new Date());
                return (
                  <tr key={r.id}>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {formatWhen(r.createdAt)}
                      {stale ? <span className="af-stale-chip">Parada 7+ dias</span> : null}
                    </td>
                    <td>{r.companyName ?? "—"}</td>
                    <td>{r.jobTitle ?? "—"}</td>
                    <td>
                      <JobMetaCell meta={r.jobMeta} />
                    </td>
                    <td>
                      <select
                        className="af-input"
                        style={{ minWidth: "140px", fontSize: "12px", padding: "4px 6px" }}
                        value={r.status}
                        onChange={(e) => void onStatusChange(r.id, e.target.value as ApplyFlowApplicationStatus)}
                      >
                        {(Object.entries(APPLYFLOW_APPLICATION_STATUS_LABELS_PT) as [ApplyFlowApplicationStatus, string][]).map(
                          ([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ),
                        )}
                      </select>
                    </td>
                    <td>{r.fitScore ?? "—"}</td>
                    <td>
                      det. {r.fieldsDetected ?? "—"} / pre. {r.fieldsFilled ?? "—"}
                    </td>
                    <td>
                      {r.failedCount ?? "—"} / {r.blockedCount ?? "—"}
                    </td>
                    <td>
                      {r.jobUrl ? (
                        <a href={r.jobUrl} target="_blank" rel="noopener noreferrer" className="af-history-link">
                          Abrir
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td style={{ minWidth: "160px" }}>
                      <textarea
                        key={`${r.id}_${r.updatedAt}`}
                        className="af-input af-input-area"
                        style={{ minHeight: "52px", fontSize: "12px" }}
                        defaultValue={r.notes ?? ""}
                        onBlur={(e) => void onNotesBlur(r.id, e.target.value)}
                        placeholder="Notas (opcional)"
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="af-opt-btn-secondary"
                        style={{ width: "auto", padding: "4px 8px" }}
                        onClick={() => void onDelete(r.id)}
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
