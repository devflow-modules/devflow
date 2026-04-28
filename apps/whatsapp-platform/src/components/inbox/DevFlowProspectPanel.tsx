"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patchInboxThreadProspect } from "./inboxFetch";
import { INBOX_QK, type WaInboxThreadRow } from "./inboxTypes";
import {
  PROSPECT_SOURCES,
  SALES_STAGE_ABBREV,
  SALES_STAGE_BADGE_CLASS,
  SALES_STAGE_LABELS_PT,
  SOURCE_LABELS_PT,
  prospectBadges,
  type ProspectSource,
  type SalesStage,
} from "@/modules/inbox/prospectSales";
import { PROSPECT_MESSAGE_TEMPLATES } from "@/modules/inbox/prospectMessageTemplates";

function followUpTomorrowMorningIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
}

function toDatetimeLocalValue(iso: string | undefined): string {
  if (!iso?.trim()) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalToIso(local: string): string | undefined {
  if (!local?.trim()) return undefined;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function formatPtDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatProposalBrl(value: number): string {
  try {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  } catch {
    return String(value);
  }
}

async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    window.prompt("Copiar texto (Ctrl+C):", text);
  }
}

export function DevFlowProspectPanel({ thread }: { thread: WaInboxThreadRow }) {
  const queryClient = useQueryClient();
  const prospect = thread.leadData?.prospect;
  const fuBadges = prospectBadges({ prospect });
  const stage = prospect?.salesStage;
  const stageLabel = stage ? SALES_STAGE_LABELS_PT[stage] : "Sem etapa";
  const stageClass = stage ? SALES_STAGE_BADGE_CLASS[stage] : "bg-slate-100 text-slate-600 ring-1 ring-slate-200/90";

  const [companyName, setCompanyName] = useState("");
  const [niche, setNiche] = useState("");
  const [city, setCity] = useState("");
  const [source, setSource] = useState<ProspectSource | "">("");
  const [pain, setPain] = useState("");
  const [attendantsCount, setAttendantsCount] = useState("");
  const [estimatedVolume, setEstimatedVolume] = useState("");
  const [proposalValueStr, setProposalValueStr] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [nextFollowLocal, setNextFollowLocal] = useState("");
  const [copyFlash, setCopyFlash] = useState<string | null>(null);

  const prospectSyncKey = useMemo(
    () => JSON.stringify(thread.leadData?.prospect ?? null),
    [thread.leadData?.prospect]
  );

  useEffect(() => {
    const p = thread.leadData?.prospect;
    queueMicrotask(() => {
      setCompanyName(p?.companyName ?? "");
      setNiche(p?.niche ?? "");
      setCity(p?.city ?? "");
      setSource(p?.source ?? "");
      setPain(p?.pain ?? "");
      setAttendantsCount(p?.attendantsCount ?? "");
      setEstimatedVolume(p?.estimatedVolume ?? "");
      setProposalValueStr(
        p?.proposalValue != null && Number.isFinite(p.proposalValue) ? String(p.proposalValue) : ""
      );
      setNextStep(p?.nextStep ?? "");
      setNextFollowLocal(toDatetimeLocalValue(p?.nextFollowUpAt));
    });
  // prospectSyncKey agrega `leadData.prospect` (evita dependência instável do objeto).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread.id, prospectSyncKey]);

  const invalidateProspect = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: INBOX_QK.thread(thread.id) });
    void queryClient.invalidateQueries({ queryKey: ["inbox-conversations"], exact: false });
    void queryClient.invalidateQueries({ queryKey: ["inbox-prospect-metrics"] });
  }, [queryClient, thread.id]);

  const mutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => patchInboxThreadProspect(thread.id, body),
    onSuccess: invalidateProspect,
  });

  const qBtn =
    "rounded-lg border border-slate-200/90 bg-white px-2 py-1.5 text-[10px] font-semibold leading-tight text-slate-800 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--df-brand-500)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45";

  const patchStage = (salesStage: SalesStage, ns?: string) => {
    mutation.mutate({
      salesStage,
      ...(ns ? { nextStep: ns } : {}),
    });
  };

  const onSaveForm = () => {
    const body: Record<string, unknown> = {};
    if (companyName.trim()) body.companyName = companyName.trim();
    if (niche.trim()) body.niche = niche.trim();
    if (city.trim()) body.city = city.trim();
    if (source) body.source = source;
    if (pain.trim()) body.pain = pain.trim();
    if (attendantsCount.trim()) body.attendantsCount = attendantsCount.trim();
    if (estimatedVolume.trim()) body.estimatedVolume = estimatedVolume.trim();
    if (nextStep.trim()) body.nextStep = nextStep.trim();
    const iso = fromDatetimeLocalToIso(nextFollowLocal);
    if (iso) body.nextFollowUpAt = iso;
    if (proposalValueStr.trim()) {
      const n = parseFloat(proposalValueStr.replace(/\s/g, "").replace(",", "."));
      if (Number.isFinite(n)) body.proposalValue = n;
    }
    if (Object.keys(body).length === 0) return;
    mutation.mutate(body);
  };

  const originLabel = prospect?.source ? SOURCE_LABELS_PT[prospect.source] : null;

  const hasAnyProspect =
    Boolean(prospect?.source) ||
    Boolean(prospect?.nextStep) ||
    Boolean(prospect?.nextFollowUpAt) ||
    prospect?.proposalValue != null ||
    Boolean(stage);

  const onCopyTemplate = async (id: string, text: string) => {
    await copyToClipboard(text);
    setCopyFlash(id);
    setTimeout(() => setCopyFlash(null), 2000);
  };

  return (
    <section
      className="rounded-xl border border-slate-200/85 bg-white/95 px-3 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
      data-testid="devflow-prospect-panel"
    >
      <h4 className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Prospecção DevFlow</h4>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${stageClass}`}
          data-testid="prospect-stage-badge"
          title={stage ? SALES_STAGE_LABELS_PT[stage] : undefined}
        >
          {stage ? SALES_STAGE_ABBREV[stage] : "—"}
        </span>
        {fuBadges.map((b) => (
          <span key={b.id} className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${b.className}`}>
            {b.label}
          </span>
        ))}
      </div>

      <div className="mt-3 space-y-2 text-left">
        <div className="space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Etapa (resumo)</p>
          <p className="text-xs text-slate-700">{stageLabel}</p>
        </div>
        <div className="space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Origem</p>
          <p className="text-sm text-slate-900">{originLabel ?? "—"}</p>
        </div>
        <div className="space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Próximo passo</p>
          <p className="text-sm text-slate-900">{prospect?.nextStep?.trim() ? prospect.nextStep : "—"}</p>
        </div>
        <div className="space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Próximo follow-up</p>
          <p className="text-sm text-slate-900">
            {prospect?.nextFollowUpAt?.trim() ? formatPtDateTime(prospect.nextFollowUpAt) : "—"}
          </p>
        </div>
        <div className="space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Valor da proposta</p>
          <p className="text-sm font-medium tabular-nums text-slate-900">
            {prospect?.proposalValue != null && Number.isFinite(prospect.proposalValue)
              ? formatProposalBrl(prospect.proposalValue)
              : "—"}
          </p>
        </div>
      </div>

      {!hasAnyProspect ? (
        <p className="mt-2 text-xs text-slate-500">
          Ainda sem dados de prospecção nesta conversa. Preencha o formulário abaixo ou use ações rápidas.
        </p>
      ) : null}

      <details className="mt-3 rounded-lg border border-slate-200/80 bg-slate-50/50 px-2 py-1.5">
        <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-wide text-slate-600">
          Editar dados
        </summary>
        <div className="mt-2 space-y-2 pb-1">
          <label className="block">
            <span className="text-[9px] font-semibold text-slate-500">Empresa</span>
            <input
              className="mt-0.5 w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              maxLength={200}
            />
          </label>
          <label className="block">
            <span className="text-[9px] font-semibold text-slate-500">Nicho</span>
            <input
              className="mt-0.5 w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              maxLength={200}
            />
          </label>
          <label className="block">
            <span className="text-[9px] font-semibold text-slate-500">Cidade</span>
            <input
              className="mt-0.5 w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              maxLength={120}
            />
          </label>
          <label className="block">
            <span className="text-[9px] font-semibold text-slate-500">Origem</span>
            <select
              className="mt-0.5 w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs"
              value={source}
              onChange={(e) => setSource((e.target.value || "") as ProspectSource | "")}
            >
              <option value="">—</option>
              {PROSPECT_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {SOURCE_LABELS_PT[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[9px] font-semibold text-slate-500">Dor / contexto</span>
            <textarea
              className="mt-0.5 w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs"
              rows={2}
              value={pain}
              onChange={(e) => setPain(e.target.value)}
              maxLength={800}
            />
          </label>
          <label className="block">
            <span className="text-[9px] font-semibold text-slate-500">Atendentes (texto)</span>
            <input
              className="mt-0.5 w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs"
              value={attendantsCount}
              onChange={(e) => setAttendantsCount(e.target.value)}
              maxLength={80}
            />
          </label>
          <label className="block">
            <span className="text-[9px] font-semibold text-slate-500">Volume estimado</span>
            <input
              className="mt-0.5 w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs"
              value={estimatedVolume}
              onChange={(e) => setEstimatedVolume(e.target.value)}
              maxLength={200}
            />
          </label>
          <label className="block">
            <span className="text-[9px] font-semibold text-slate-500">Valor proposta (número)</span>
            <input
              type="number"
              step="0.01"
              min={0}
              className="mt-0.5 w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs tabular-nums"
              value={proposalValueStr}
              onChange={(e) => setProposalValueStr(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-[9px] font-semibold text-slate-500">Próximo passo</span>
            <input
              className="mt-0.5 w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs"
              value={nextStep}
              onChange={(e) => setNextStep(e.target.value)}
              maxLength={500}
            />
          </label>
          <label className="block">
            <span className="text-[9px] font-semibold text-slate-500">Próximo follow-up</span>
            <input
              type="datetime-local"
              className="mt-0.5 w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs"
              value={nextFollowLocal}
              onChange={(e) => setNextFollowLocal(e.target.value)}
            />
          </label>
          <button
            type="button"
            disabled={mutation.isPending}
            onClick={onSaveForm}
            className="w-full rounded-lg bg-[var(--df-brand-600)] px-2 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[var(--df-brand-700)] disabled:opacity-50"
          >
            Guardar dados
          </button>
        </div>
      </details>

      <div className="mt-3 space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Templates (copiar)</p>
        <div className="flex flex-wrap gap-1">
          {PROSPECT_MESSAGE_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              disabled={mutation.isPending}
              onClick={() => void onCopyTemplate(t.id, t.text)}
              className={`rounded-md border px-2 py-1 text-[9px] font-semibold shadow-sm transition ${
                copyFlash === t.id
                  ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {copyFlash === t.id ? "Copiado" : t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Ações rápidas</p>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className={qBtn} disabled={mutation.isPending} onClick={() => patchStage("CONTACTED")}>
            Contato feito
          </button>
          <button
            type="button"
            className={qBtn}
            disabled={mutation.isPending}
            onClick={() => patchStage("DIAGNOSIS_SCHEDULED", "Diagnóstico agendado")}
          >
            Diagnóstico agendado
          </button>
          <button type="button" className={qBtn} disabled={mutation.isPending} onClick={() => patchStage("PROPOSAL_SENT")}>
            Proposta enviada
          </button>
          <button type="button" className={qBtn} disabled={mutation.isPending} onClick={() => patchStage("WON")}>
            Fechado
          </button>
          <button type="button" className={qBtn} disabled={mutation.isPending} onClick={() => patchStage("LOST")}>
            Perdido
          </button>
          <button
            type="button"
            className={qBtn}
            disabled={mutation.isPending}
            onClick={() => mutation.mutate({ nextFollowUpAt: followUpTomorrowMorningIso() })}
            title="Define follow-up para amanhã às 09:00 (hora local do browser)"
          >
            Agendar follow-up
          </button>
        </div>
      </div>

      {mutation.isError ? (
        <p className="mt-2 text-[11px] text-red-700" role="alert">
          {mutation.error instanceof Error ? mutation.error.message : "Erro ao gravar"}
        </p>
      ) : null}
    </section>
  );
}
