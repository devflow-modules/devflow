"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@devflow/ui";
import { AiStatusBanner, type AiBannerState } from "@/components/ai/AiStatusBanner";
import { StateLoading } from "@/components/ui/app-states";
import { buttonClassName } from "@/components/ui/button";
import {
  FormActions,
  FormField,
  FormSection,
  fieldSelectClassName,
  fieldTextareaClassName,
} from "@/components/ui/form-field";
import { fetchProtected, protectedApiUserMessage } from "@/lib/protected-fetch";
import type { AiAgentTone } from "@/generated/prisma-whatsapp";
import type { AiBehaviorPreset } from "@/modules/ai/aiPresets";
import type { AiState, PlaybookJson } from "@/modules/ai/conversationStateService";

type Tone = AiAgentTone;

const FUNNEL_STAGES: readonly AiState[] = [
  "lead",
  "qualifying",
  "negotiating",
  "support",
  "closed",
] as const;

const STAGE_LABELS: Record<AiState, string> = {
  lead: "Lead",
  qualifying: "Qualificação",
  negotiating: "Negociação",
  support: "Suporte",
  closed: "Fechado",
};

type PlaybookDraftRow = { goal: string; rulesText: string };

function emptyPlaybookDraft(): Record<AiState, PlaybookDraftRow> {
  return {
    lead: { goal: "", rulesText: "" },
    qualifying: { goal: "", rulesText: "" },
    negotiating: { goal: "", rulesText: "" },
    support: { goal: "", rulesText: "" },
    closed: { goal: "", rulesText: "" },
  };
}

function hydratePlaybookDraft(p: PlaybookJson | null | undefined): Record<AiState, PlaybookDraftRow> {
  const base = emptyPlaybookDraft();
  if (!p) return base;
  for (const s of FUNNEL_STAGES) {
    const row = p[s];
    if (!row) continue;
    base[s] = {
      goal: row.goal ?? "",
      rulesText: (row.rules ?? []).join("\n"),
    };
  }
  return base;
}

function buildPlaybookJsonFromDraft(d: Record<AiState, PlaybookDraftRow>): PlaybookJson | null {
  const out: PlaybookJson = {};
  for (const s of FUNNEL_STAGES) {
    const goal = d[s].goal.trim();
    const rules = d[s].rulesText
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
    if (goal || rules.length) {
      out[s] = {
        ...(goal ? { goal } : {}),
        ...(rules.length ? { rules } : {}),
      };
    }
  }
  return Object.keys(out).length ? out : null;
}

type UsageStatus = {
  used: number;
  limit: number | null;
  percent_used: number | null;
  can_use: boolean;
};

type PlanInfo = { plan_name: string };

type AiCfg = {
  enabled: boolean;
  systemPrompt: string;
  model: string;
  tone: Tone;
  maxTokens: number;
  temperature: number;
  fallbackToHuman: boolean;
  driver: string | null;
  tenantAiDriver: string | null;
  assistantName: string | null;
  businessContext: string | null;
  goal: string | null;
  rules: string[];
  forbiddenTopics: string[];
  handoffTriggers: string[];
  autoReply: boolean;
  outOfHoursReply: string | null;
  configVersion: number;
  updatedAt: string;
  updatedByUserId: string | null;
  playbookJson?: PlaybookJson | null;
};

const MODELS = [
  { value: "gpt-4o-mini", label: "gpt-4o-mini (rápido, econômico)" },
  { value: "gpt-4o", label: "gpt-4o (mais capaz)" },
] as const;

const CLAUDE_MODELS = [
  { value: "claude-3-5-haiku-20241022", label: "Claude Haiku (rápido)" },
  { value: "claude-3-5-sonnet-20241022", label: "Claude Sonnet (mais capaz)" },
] as const;

const TONES: { value: Tone; label: string }[] = [
  { value: "FRIENDLY", label: "Amigável" },
  { value: "SALES", label: "Comercial" },
  { value: "SUPPORT", label: "Suporte" },
  { value: "NEUTRAL", label: "Neutro" },
];

const DRIVER_OPTIONS = [
  { value: "", label: "Herdar das configurações gerais" },
  { value: "ruleBased", label: "Apenas regras (sem LLM)" },
  { value: "openAI", label: "OpenAI (GPT)" },
  { value: "claude", label: "Claude (Anthropic)" },
] as const;

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

function getBannerState(enabled: boolean, usageStatus: UsageStatus | null): AiBannerState {
  if (!enabled) return "disabled";
  if (!usageStatus) return "active";
  if (!usageStatus.can_use) return "exceeded";
  if (usageStatus.percent_used != null && usageStatus.percent_used >= 70) return "near_limit";
  return "active";
}

function StringListEditor(props: {
  id: string;
  label: string;
  help?: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const { id, label, help, values, onChange, placeholder } = props;
  return (
    <div className="space-y-2">
      <div>
        <label className="text-sm font-medium text-slate-800" htmlFor={id}>
          {label}
        </label>
        {help ? <p className="mt-0.5 text-xs text-slate-500">{help}</p> : null}
      </div>
      <ul className="space-y-2">
        {values.map((line, i) => (
          <li key={`${id}-${i}`} className="flex gap-2">
            <input
              id={i === 0 ? id : undefined}
              type="text"
              value={line}
              onChange={(e) => {
                const next = [...values];
                next[i] = e.target.value;
                onChange(next);
              }}
              placeholder={placeholder}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-[var(--df-brand-500)] focus:outline-none focus:ring-2 focus:ring-[var(--df-brand-500)]/25"
            />
            <button
              type="button"
              className={buttonClassName("secondary", "shrink-0 px-2 text-xs")}
              onClick={() => onChange(values.filter((_, j) => j !== i))}
            >
              Remover
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className={buttonClassName("secondary", "text-sm")}
        onClick={() => onChange([...values, ""])}
      >
        Adicionar linha
      </button>
    </div>
  );
}

export function AiSettingsForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [presets, setPresets] = useState<AiBehaviorPreset[]>([]);

  const [enabled, setEnabled] = useState(false);
  const [autoReply, setAutoReply] = useState(true);
  const [outOfHoursReply, setOutOfHoursReply] = useState("");
  const [fallbackToHuman, setFallbackToHuman] = useState(true);

  const [assistantName, setAssistantName] = useState("");
  const [tone, setTone] = useState<Tone>("NEUTRAL");

  const [businessContext, setBusinessContext] = useState("");
  const [goal, setGoal] = useState("");

  const [rules, setRules] = useState<string[]>([]);
  const [forbiddenTopics, setForbiddenTopics] = useState<string[]>([]);
  const [handoffTriggers, setHandoffTriggers] = useState<string[]>([]);

  const [driver, setDriver] = useState<string>("");
  const [tenantAiDriver, setTenantAiDriver] = useState<string | null>(null);
  const [model, setModel] = useState("gpt-4o-mini");
  const [maxTokens, setMaxTokens] = useState(220);
  const [temperature, setTemperature] = useState(0.4);
  const [systemPrompt, setSystemPrompt] = useState("");

  const [configVersion, setConfigVersion] = useState(1);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const [usageStatus, setUsageStatus] = useState<UsageStatus | null>(null);
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);

  const [playbookDraft, setPlaybookDraft] = useState<Record<AiState, PlaybookDraftRow>>(emptyPlaybookDraft);

  const [testMessage, setTestMessage] = useState("Olá, quero saber mais sobre o serviço.");
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  type TestRun = {
    reply: string;
    decision: { allow: boolean; reason: string; confidence: number | null };
    state: string;
    usedDriver: string;
    usedModel: string;
    latencyMs: number;
    fallback: boolean;
    error: string | null;
  };
  const [testRun, setTestRun] = useState<TestRun | null>(null);

  const applyCfg = useCallback((d: AiCfg) => {
    setEnabled(d.enabled);
    setAutoReply(d.autoReply);
    setOutOfHoursReply(d.outOfHoursReply ?? "");
    setFallbackToHuman(d.fallbackToHuman);
    setAssistantName(d.assistantName ?? "");
    setTone(d.tone);
    setBusinessContext(d.businessContext ?? "");
    setGoal(d.goal ?? "");
    setRules(d.rules?.length ? [...d.rules] : []);
    setForbiddenTopics(d.forbiddenTopics?.length ? [...d.forbiddenTopics] : []);
    setHandoffTriggers(d.handoffTriggers?.length ? [...d.handoffTriggers] : []);
    setDriver(d.driver ?? "");
    setTenantAiDriver(d.tenantAiDriver);
    setModel(d.model);
    setMaxTokens(clamp(d.maxTokens ?? 220, 50, 500));
    setTemperature(clamp(d.temperature ?? 0.4, 0, 1));
    setSystemPrompt(d.systemPrompt ?? "");
    setConfigVersion(d.configVersion);
    setUpdatedAt(d.updatedAt);
    setPlaybookDraft(hydratePlaybookDraft(d.playbookJson ?? null));
  }, []);

  const load = useCallback(async () => {
    try {
      const [rConfig, rStatus, rPlan] = await Promise.all([
        fetchProtected("/api/ai/config"),
        fetchProtected("/api/billing/ai-usage-status"),
        fetchProtected("/api/billing/ai-plan"),
      ]);
      const j = (await rConfig.json().catch(() => ({}))) as {
        data?: AiCfg;
        presets?: AiBehaviorPreset[];
        error?: string;
        success?: boolean;
      };
      if (!rConfig.ok) {
        setError(protectedApiUserMessage(rConfig.status, j));
        return;
      }
      if (j.data) applyCfg(j.data);
      if (j.presets?.length) setPresets(j.presets);

      if (rStatus.ok) {
        const jStatus = await rStatus.json();
        if (jStatus.success) setUsageStatus(jStatus.data);
      }
      if (rPlan.ok) {
        const jPlan = await rPlan.json();
        if (jPlan.success) setPlanInfo(jPlan.data);
      }
    } catch {
      setError("Erro de conexão");
    } finally {
      setLoading(false);
    }
  }, [applyCfg]);

  useEffect(() => {
    load();
  }, [load]);

  function buildPutBody() {
    return {
      enabled,
      autoReply,
      outOfHoursReply: outOfHoursReply.trim() || null,
      fallbackToHuman,
      assistantName: assistantName.trim() || null,
      tone,
      businessContext: businessContext.trim() || null,
      goal: goal.trim() || null,
      rules: rules.map((r) => r.trim()).filter(Boolean),
      forbiddenTopics: forbiddenTopics.map((r) => r.trim()).filter(Boolean),
      handoffTriggers: handoffTriggers.map((r) => r.trim()).filter(Boolean),
      driver: driver === "" ? null : driver,
      model,
      maxTokens: clamp(maxTokens, 50, 500),
      temperature: clamp(temperature, 0, 1),
      systemPrompt,
      playbookJson: buildPlaybookJsonFromDraft(playbookDraft),
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetchProtected("/api/ai/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPutBody()),
      });
      const errBody = (await res.json().catch(() => ({}))) as { error?: string; data?: AiCfg };
      if (!res.ok) {
        throw new Error(protectedApiUserMessage(res.status, errBody));
      }
      if (errBody.data) applyCfg(errBody.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTestError(null);
    setTestRun(null);
    setTestLoading(true);
    try {
      const res = await fetchProtected("/api/ai/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: testMessage,
          draft: buildPutBody(),
        }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        data?: TestRun;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(j.error ?? protectedApiUserMessage(res.status, j));
      }
      if (j.data) {
        setTestRun({
          reply: j.data.reply ?? "",
          decision: j.data.decision ?? { allow: false, reason: "—", confidence: null },
          state: j.data.state ?? "lead",
          usedDriver: j.data.usedDriver ?? "rules",
          usedModel: j.data.usedModel ?? "",
          latencyMs: j.data.latencyMs ?? 0,
          fallback: Boolean(j.data.fallback),
          error: j.data.error ?? null,
        });
        if (j.data.error && !j.data.reply) {
          setTestError(j.data.error);
        }
      }
    } catch (err) {
      setTestError(err instanceof Error ? err.message : "Erro no teste");
    } finally {
      setTestLoading(false);
    }
  }

  function applyPreset(p: AiBehaviorPreset) {
    setTone(p.tone);
    setGoal(p.goal);
    setBusinessContext(p.businessContext);
    setRules([...p.rules]);
    setForbiddenTopics([...p.forbiddenTopics]);
    setHandoffTriggers([...p.handoffTriggers]);
  }

  const previewDriver =
    driver === "" ? (tenantAiDriver && tenantAiDriver !== "" ? tenantAiDriver : "ruleBased") : driver;
  const modelOptions = previewDriver === "claude" ? CLAUDE_MODELS : MODELS;

  if (loading) {
    return <StateLoading message="A carregar configuração de IA…" />;
  }

  return (
    <form id="wf-ai-settings" onSubmit={handleSubmit} className="max-w-3xl space-y-8">
      <FormSection
        title="Ativação"
        description="Controlo global da IA automática e políticas de resposta."
      >
        <div className="space-y-3">
          <label className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-[var(--df-brand-600)]"
            />
            <span className="text-sm font-medium text-slate-800">IA ativada para o espaço de trabalho</span>
          </label>
          <label className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3">
            <input
              type="checkbox"
              checked={autoReply}
              onChange={(e) => setAutoReply(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-[var(--df-brand-600)]"
            />
            <span className="text-sm font-medium text-slate-800">Responder automaticamente a mensagens recebidas</span>
          </label>
          <label className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3">
            <input
              type="checkbox"
              checked={fallbackToHuman}
              onChange={(e) => setFallbackToHuman(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-[var(--df-brand-600)]"
            />
            <span className="text-sm font-medium text-slate-800">Preferir handoff para humano quando a IA não tiver confiança</span>
          </label>
        </div>
        <FormField id="outOfHours" label="Resposta fora de horário (texto fixo)" htmlFor="outOfHours" help="Opcional. Horários efectivos podem ser configurados noutro módulo numa fase posterior.">
          <textarea
            id="outOfHours"
            value={outOfHoursReply}
            onChange={(e) => setOutOfHoursReply(e.target.value)}
            rows={3}
            className={fieldTextareaClassName}
            placeholder="Ex.: O nosso horário é… Voltamos em breve."
          />
        </FormField>
        <AiStatusBanner
          state={getBannerState(enabled, usageStatus)}
          enabled={enabled}
          used={usageStatus?.used}
          limit={usageStatus?.limit ?? undefined}
          percentUsed={usageStatus?.percent_used ?? undefined}
          planName={planInfo?.plan_name}
        />
      </FormSection>

      <FormSection title="Presets" description="Comece com um perfil e ajuste ao seu negócio.">
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              className={buttonClassName("secondary", "text-sm")}
              onClick={() => applyPreset(p)}
            >
              Aplicar: {p.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500">Os presets preenchem tom, objetivo, contexto e listas — não substituem o nome do assistente.</p>
      </FormSection>

      <FormSection title="Identidade do assistente" description="Como a IA se apresenta ao cliente.">
        <FormField id="assistantName" label="Nome do assistente" htmlFor="assistantName">
          <input
            id="assistantName"
            type="text"
            value={assistantName}
            onChange={(e) => setAssistantName(e.target.value)}
            className="w-full max-w-md rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Ex.: Equipa DevFlow"
          />
        </FormField>
        <FormField id="tone" label="Tom de voz" htmlFor="tone">
          <select
            id="tone"
            value={tone}
            onChange={(e) => setTone(e.target.value as Tone)}
            className={`max-w-xs ${fieldSelectClassName}`}
          >
            {TONES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </FormField>
      </FormSection>

      <FormSection title="Contexto do negócio" description="O que a empresa faz e o que a IA deve alcançar na conversa.">
        <FormField id="biz" label="O que a empresa faz" htmlFor="biz">
          <textarea
            id="biz"
            value={businessContext}
            onChange={(e) => setBusinessContext(e.target.value)}
            rows={4}
            className={fieldTextareaClassName}
            placeholder="Produtos, público-alvo, canais…"
          />
        </FormField>
        <FormField id="goal" label="Objetivo da IA neste canal" htmlFor="goal">
          <textarea
            id="goal"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            rows={3}
            className={fieldTextareaClassName}
            placeholder="Ex.: qualificar leads e agendar demonstrações."
          />
        </FormField>
      </FormSection>

      <FormSection title="Regras" description="Instruções operacionais em lista.">
        <StringListEditor
          id="rules"
          label="Regras"
          values={rules}
          onChange={setRules}
          placeholder="Ex.: não prometer prazos sem confirmar"
        />
      </FormSection>

      <FormSection title="Restrições" description="Temas que a IA deve evitar ou recusar educadamente.">
        <StringListEditor
          id="forbidden"
          label="Tópicos proibidos ou sensíveis"
          values={forbiddenTopics}
          onChange={setForbiddenTopics}
        />
      </FormSection>

      <FormSection title="Handoff" description="Quando pedir intervenção humana.">
        <StringListEditor
          id="handoff"
          label="Gatilhos de transferência"
          help="Ex.: pedido explícito de falar com pessoa, reclamação grave…"
          values={handoffTriggers}
          onChange={setHandoffTriggers}
        />
      </FormSection>

      <FormSection
        title="Estratégia de atendimento (funil)"
        description="Define objetivo e linhas de orientação por estágio. Valores vazios usam o playbook padrão do produto."
      >
        <div className="space-y-6">
          {FUNNEL_STAGES.map((stage) => (
            <div
              key={stage}
              className="rounded-xl border border-slate-100 bg-slate-50/40 px-4 py-3"
            >
              <p className="text-sm font-bold text-slate-900">{STAGE_LABELS[stage]}</p>
              <FormField
                id={`pb-goal-${stage}`}
                label="Objetivo"
                htmlFor={`pb-goal-${stage}`}
              >
                <input
                  id={`pb-goal-${stage}`}
                  type="text"
                  value={playbookDraft[stage].goal}
                  onChange={(e) =>
                    setPlaybookDraft((prev) => ({
                      ...prev,
                      [stage]: { ...prev[stage], goal: e.target.value },
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Opcional — sobrescreve o objetivo padrão deste estágio"
                />
              </FormField>
              <FormField
                id={`pb-rules-${stage}`}
                label="Regras / orientações (uma por linha)"
                htmlFor={`pb-rules-${stage}`}
              >
                <textarea
                  id={`pb-rules-${stage}`}
                  rows={3}
                  value={playbookDraft[stage].rulesText}
                  onChange={(e) =>
                    setPlaybookDraft((prev) => ({
                      ...prev,
                      [stage]: { ...prev[stage], rulesText: e.target.value },
                    }))
                  }
                  className={fieldTextareaClassName}
                  placeholder="Ex.: perguntar orçamento antes de preço"
                />
              </FormField>
            </div>
          ))}
        </div>
      </FormSection>

      <FormSection
        title="Teste de IA"
        description="Simula uma resposta sem gravar. Usa o rascunho actual do formulário (incluindo alterações não guardadas)."
      >
        <FormField id="testMsg" label="Mensagem do cliente (simulada)" htmlFor="testMsg">
          <textarea
            id="testMsg"
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            rows={3}
            className={fieldTextareaClassName}
          />
        </FormField>
        <button type="button" className={buttonClassName("secondary")} disabled={testLoading} onClick={handleTest}>
          {testLoading ? "A testar…" : "Testar IA"}
        </button>
        {testLoading ? (
          <p className="text-sm text-slate-500">A simular decisão e resposta (sem gravar)…</p>
        ) : null}
        {testError ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="alert">
            {testError}
          </div>
        ) : null}
        {testRun ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm ring-1 ring-slate-900/[0.04]">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Resposta</p>
              <p className="mt-2 min-h-[1.25rem] whitespace-pre-wrap text-slate-900">
                {testRun.reply || "—"}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-sm shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Decisão (guard)</p>
                <p className="mt-2 font-medium text-slate-900">
                  {testRun.decision.allow ? "Permitido" : "Bloqueado / handoff"}
                </p>
                <p className="mt-1 text-xs text-slate-600">{testRun.decision.reason}</p>
                {testRun.decision.confidence != null ? (
                  <p className="mt-1 text-xs text-slate-500">
                    Confiança: {testRun.decision.confidence}
                  </p>
                ) : null}
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-sm shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Estado (playbook)</p>
                <p className="mt-2 font-mono text-base font-semibold text-slate-900">{testRun.state}</p>
                <p className="mt-1 text-xs text-slate-500">Simulação com 1 mensagem de entrada.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-sm shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Execução</p>
                <ul className="mt-2 space-y-1 text-slate-800">
                  <li>
                    <span className="text-slate-500">Motor:</span> {testRun.usedDriver}
                  </li>
                  <li>
                    <span className="text-slate-500">Modelo:</span> {testRun.usedModel || "—"}
                  </li>
                  <li>
                    <span className="text-slate-500">Latência:</span>{" "}
                    <span className="tabular-nums font-semibold">{testRun.latencyMs} ms</span>
                  </li>
                </ul>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-sm shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
                <p className="mt-2 text-slate-900">
                  Fallback:{" "}
                  <strong>{testRun.fallback ? "sim" : "não"}</strong>
                </p>
                {testRun.error ? (
                  <p className="mt-2 rounded-md border border-amber-200/80 bg-amber-50 px-2 py-1.5 text-xs text-amber-950">
                    {testRun.error}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-slate-500">Sem erro de execução.</p>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </FormSection>

      <details className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
        <summary className="cursor-pointer text-sm font-bold text-slate-900">Avançado — motor LLM e prompt legado</summary>
        <div className="mt-4 space-y-4 border-t border-slate-200/80 pt-4">
          <p className="text-xs text-slate-600">
            Motor global do tenant: <strong>{tenantAiDriver ?? "não definido"}</strong>. Pode sobrescrever só para a IA de atendimento.
          </p>
          <FormField id="drv" label="Motor (override)" htmlFor="drv">
            <select
              id="drv"
              value={driver}
              onChange={(e) => setDriver(e.target.value)}
              className={`max-w-lg ${fieldSelectClassName}`}
            >
              {DRIVER_OPTIONS.map((d) => (
                <option key={d.value || "inherit"} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="model" label="Modelo" htmlFor="model">
            <select
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className={`max-w-md ${fieldSelectClassName}`}
            >
              {modelOptions.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="temp" label="Temperatura" htmlFor="temp">
            <div className="flex flex-wrap items-center gap-3">
              <input
                id="temp"
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                className="h-2 w-full max-w-xs cursor-pointer accent-[var(--df-brand-600)]"
              />
              <span className="tabular-nums text-sm font-semibold text-slate-700">{temperature}</span>
            </div>
          </FormField>
          <FormField id="maxTok" label="Máximo de tokens na resposta" htmlFor="maxTok">
            <div className="flex flex-wrap items-center gap-3">
              <input
                id="maxTok"
                type="range"
                min={50}
                max={500}
                step={10}
                value={maxTokens}
                onChange={(e) => setMaxTokens(Number(e.target.value))}
                className="h-2 w-full max-w-xs cursor-pointer accent-[var(--df-brand-600)]"
              />
              <span className="tabular-nums text-sm font-semibold text-slate-700">{maxTokens}</span>
            </div>
          </FormField>
          <FormField
            id="legacyPrompt"
            label="Prompt de sistema legado"
            htmlFor="legacyPrompt"
            help="Usado apenas se não preencher os campos de comportamento acima. Preferimos o painel estruturado."
          >
            <textarea
              id="legacyPrompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={8}
              className={`${fieldTextareaClassName} font-mono text-[13px]`}
            />
          </FormField>
        </div>
      </details>

      {updatedAt ? (
        <p className="text-xs text-slate-500">
          Versão {configVersion} · última alteração {new Date(updatedAt).toLocaleString("pt-BR")}
        </p>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200/90 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </div>
      ) : null}

      <FormActions>
        <Button type="submit" disabled={saving}>
          {saving ? "A guardar…" : "Guardar alterações"}
        </Button>
        <Link href="/settings" className={buttonClassName("secondary")}>
          Voltar às configurações
        </Link>
      </FormActions>
    </form>
  );
}
