"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Button } from "@devflow/ui";
import { AiStatusBanner, type AiBannerState } from "@/components/ai/AiStatusBanner";
import { StateLoading } from "@/components/ui/app-states";
import { buttonClassName } from "@/components/ui/button";
import {
  FormActions,
  FormField,
  FieldHelp,
  fieldSelectClassName,
  fieldTextareaClassName,
} from "@/components/ui/form-field";
import { AiSettingsPhase, AiSettingsSubheading } from "./AiSettingsPhase";
import { AiSettingsAnchorNav } from "./AiSettingsAnchorNav";
import { AiStatusSummary } from "./AiStatusSummary";
import { fetchProtected, protectedApiUserMessage } from "@/lib/protected-fetch";
import { PricingContextHint } from "@/components/dashboard/billing/PricingContextHint";
import { getUiPlanCapabilities } from "@/modules/billing/planUiCapabilities";
import { FEATURE_UPGRADE_COPY } from "@/modules/billing/featureUpgradeCopy";
import { contextualAiUsageHint } from "@/modules/billing/usageCommunication";
import type { AiAgentTone } from "@/generated/prisma-whatsapp";
import type { AiBehaviorPreset, AiBehaviorPresetId } from "@/modules/ai/aiPresets";
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

type PlanInfo = { plan_name: string; plan: string };

type AiCfg = {
  enabled: boolean;
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

function formatMotorLabel(driverEffective: string): string {
  switch (driverEffective) {
    case "openAI":
      return "OpenAI (GPT)";
    case "claude":
      return "Claude (Anthropic)";
    case "ruleBased":
      return "Apenas regras (sem LLM)";
    default:
      return driverEffective || "—";
  }
}

function getBannerState(enabled: boolean, usageStatus: UsageStatus | null): AiBannerState {
  if (!enabled) return "disabled";
  if (!usageStatus) return "active";
  if (!usageStatus.can_use) return "exceeded";
  if (usageStatus.percent_used != null && usageStatus.percent_used >= 80) return "near_limit";
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

function IaCrossLinks() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Link
        href="/settings"
        className="group rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 text-left shadow-sm transition hover:border-[var(--df-brand-300)] hover:bg-[var(--df-brand-50)]/40"
      >
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Motor</p>
        <p className="mt-1 text-sm font-semibold text-slate-900 group-hover:text-[var(--df-brand-900)]">
          Configurações gerais
        </p>
        <p className="mt-1 text-xs text-slate-600">OpenAI, Claude ou só regras</p>
      </Link>
      <Link
        href="/settings/ai-analytics"
        className="group rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 text-left shadow-sm transition hover:border-[var(--df-brand-300)] hover:bg-[var(--df-brand-50)]/40"
      >
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Consumo</p>
        <p className="mt-1 text-sm font-semibold text-slate-900 group-hover:text-[var(--df-brand-900)]">
          Uso e custo de IA
        </p>
        <p className="mt-1 text-xs text-slate-600">Tokens, limites do plano</p>
      </Link>
      <Link
        href="/dashboard/ai"
        className="group rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 text-left shadow-sm transition hover:border-[var(--df-brand-300)] hover:bg-[var(--df-brand-50)]/40"
      >
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Operação</p>
        <p className="mt-1 text-sm font-semibold text-slate-900 group-hover:text-[var(--df-brand-900)]">
          Painel IA no atendimento
        </p>
        <p className="mt-1 text-xs text-slate-600">Saúde, funil e eventos recentes</p>
      </Link>
    </div>
  );
}

function GuardrailsSummary(props: {
  enabled: boolean;
  autoReply: boolean;
  fallbackToHuman: boolean;
  planName?: string | null;
  canUse?: boolean;
}) {
  const { enabled, autoReply, fallbackToHuman, planName, canUse } = props;
  return (
    <div className="rounded-xl border border-slate-200/90 bg-gradient-to-br from-slate-50/90 to-white p-4 text-sm text-slate-700 ring-1 ring-slate-900/[0.03]">
      <p className="font-semibold text-slate-900">Guardrails e handoff (resumo)</p>
      <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
        <li>
          <strong className="text-slate-800">Quando a IA pode responder:</strong> espaço com IA ativada, resposta
          automática ligada, decisão dos guards a permitir e{" "}
          {canUse === false ? (
            <span className="text-amber-800">quota do plano esgotada ou bloqueada</span>
          ) : (
            <span>quota disponível no plano</span>
          )}
          {planName ? (
            <>
              {" "}
              (<span className="whitespace-nowrap">plano {planName}</span>)
            </>
          ) : null}
          .
        </li>
        <li>
          <strong className="text-slate-800">Quando não responde sozinha:</strong>{" "}
          {!enabled ? (
            <span>IA desativada para o espaço de trabalho.</span>
          ) : !autoReply ? (
            <span>resposta automática desligada — a equipa trata manualmente na Inbox.</span>
          ) : (
            <span>
              se os guards bloquearem, se os gatilhos de handoff corresponderem, ou em falha técnica (registado como
              fallback no painel).
            </span>
          )}
        </li>
        <li>
          <strong className="text-slate-800">Atendimento humano preferencial:</strong>{" "}
          {fallbackToHuman
            ? "com baixa confiança ou bloqueio, o fluxo favorece transferência para humano (conforme automação)."
            : "desligado — reveja risco de respostas menos seguras em casos ambíguos."}
        </li>
        <li>
          <strong className="text-slate-800">Erro ou indisponibilidade:</strong> a conversa pode ficar sem resposta
          automática; o painel de operação mostra fallbacks e erros para acompanhar.
        </li>
      </ul>
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

  const [configVersion, setConfigVersion] = useState(1);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const [usageStatus, setUsageStatus] = useState<UsageStatus | null>(null);
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);

  const planCaps = useMemo(
    () => (planInfo?.plan != null ? getUiPlanCapabilities(planInfo.plan) : null),
    [planInfo?.plan]
  );

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
  /** Últimos testes bem-sucedidos (só UI, não persistido). */
  const [recentTestSnapshots, setRecentTestSnapshots] = useState<
    { input: string; reply: string; at: number }[]
  >([]);
  const [lastAppliedPresetId, setLastAppliedPresetId] = useState<AiBehaviorPresetId | null>(null);

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

  useEffect(() => {
    if (loading) return;
    const hash = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
    if (!hash) return;
    requestAnimationFrame(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [loading]);

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
        const run = {
          reply: j.data.reply ?? "",
          decision: j.data.decision ?? { allow: false, reason: "—", confidence: null },
          state: j.data.state ?? "lead",
          usedDriver: j.data.usedDriver ?? "rules",
          usedModel: j.data.usedModel ?? "",
          latencyMs: j.data.latencyMs ?? 0,
          fallback: Boolean(j.data.fallback),
          error: j.data.error ?? null,
        };
        setTestRun(run);
        if (j.data.error && !j.data.reply) {
          setTestError(j.data.error);
        } else if (j.data.reply || j.data.decision) {
          setRecentTestSnapshots((prev) =>
            [{ input: testMessage, reply: j.data!.reply ?? "", at: Date.now() }, ...prev].slice(0, 2)
          );
        }
      }
    } catch (err) {
      setTestError(err instanceof Error ? err.message : "Erro no teste");
    } finally {
      setTestLoading(false);
    }
  }

  function applyPreset(p: AiBehaviorPreset) {
    setLastAppliedPresetId(p.id);
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
    <form id="wf-ai-settings" onSubmit={handleSubmit} className="max-w-3xl space-y-10">
      <div className="space-y-3">
        <AiSettingsAnchorNav />
        <AiStatusSummary enabled={enabled} autoReply={autoReply} motorLabel={formatMotorLabel(previewDriver)} />
      </div>

      <AiSettingsPhase
        id="visao-geral"
        phase="1 · Visão geral"
        title="Estado, motor e atalhos"
        description="Ligações rápidas para o motor (fornecedor LLM), consumo e painel operacional. Depois afinamos comportamento → automação → limites → teste."
      >
        <IaCrossLinks />
        {driver ? (
          <p className="text-xs text-slate-600">
            <span className="df-badge whitespace-nowrap">Override de motor só nesta IA</span>
          </p>
        ) : null}
        <FieldHelp>
          O fornecedor base (OpenAI, Claude ou só regras) define-se em{" "}
          <Link href="/settings" className="font-semibold text-[var(--df-brand-700)] hover:underline">
            Configurações gerais
          </Link>
          . Aqui pode sobrescrever só para esta IA de atendimento na secção «Limites e segurança» (avançado).
        </FieldHelp>
        <label className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-[var(--df-brand-600)]"
          />
          <span className="text-sm font-medium text-slate-800">
            IA ativada para o espaço de trabalho
            <span className="mt-1 block text-xs font-normal text-slate-500">
              Sem isto, nenhuma resposta automática por IA é enviada, mesmo com regras ou prompt preenchidos.
            </span>
          </span>
        </label>
        <AiStatusBanner
          state={getBannerState(enabled, usageStatus)}
          enabled={enabled}
          used={usageStatus?.used}
          limit={usageStatus?.limit ?? undefined}
          percentUsed={usageStatus?.percent_used ?? undefined}
          planName={planInfo?.plan_name}
        />
        {planCaps ? (
          <PricingContextHint
            message={contextualAiUsageHint(planCaps.limits.aiCallsPerMonth, {
              isFreePlan: planCaps.planKey === "FREE",
            })}
          />
        ) : null}
        <div className="rounded-xl border border-dashed border-slate-200/90 bg-white/60 px-4 py-3 text-sm text-slate-600">
          <p className="font-semibold text-slate-800">Ordem sugerida de configuração</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Motor e quota (cartões acima)</li>
            <li>
              <Link href="#comportamento" className="font-medium text-[var(--df-brand-700)] hover:underline">
                Comportamento
              </Link>
              : identidade, contexto, regras e funil
            </li>
            <li>
              <Link href="#automacao" className="font-medium text-[var(--df-brand-700)] hover:underline">
                Automação
              </Link>
              : resposta automática e texto fixo
            </li>
            <li>
              <Link href="#limites" className="font-medium text-[var(--df-brand-700)] hover:underline">
                Limites
              </Link>
              : handoff, tokens e modelo (se necessário)
            </li>
            <li>
              <Link href="#teste" className="font-medium text-[var(--df-brand-700)] hover:underline">
                Teste rápido
              </Link>{" "}
              antes de publicar na Inbox
            </li>
          </ol>
        </div>
        <div>
          <AiSettingsSubheading>Templates por caso de uso</AiSettingsSubheading>
          <FieldHelp className="mb-3">
            Escolha o cenário mais próximo do seu negócio — preenchem tom, objetivo, contexto e listas (não alteram o nome
            do assistente). Pode aplicar outro template a qualquer momento.
          </FieldHelp>
          <div className="grid gap-3 sm:grid-cols-2">
            {presets.map((p) => {
              const selected = lastAppliedPresetId === p.id;
              return (
                <div
                  key={p.id}
                  className={`flex flex-col rounded-xl border bg-white p-4 text-left shadow-sm transition ${
                    selected
                      ? "border-[var(--df-brand-400)] ring-2 ring-[var(--df-brand-200)]/80"
                      : "border-slate-200/90 ring-1 ring-slate-900/[0.03]"
                  }`}
                >
                  <p className="text-sm font-bold text-slate-900">{p.label}</p>
                  <p className="mt-1 flex-1 text-xs leading-relaxed text-slate-600">{p.description}</p>
                  <button
                    type="button"
                    className={buttonClassName("secondary", "mt-3 w-full justify-center text-sm")}
                    onClick={() => applyPreset(p)}
                  >
                    Aplicar
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </AiSettingsPhase>

      <AiSettingsPhase
        id="comportamento"
        phase="2 · Comportamento"
        title="Identidade, instruções e funil"
        description="Isto molda o texto que o cliente lê: tom, contexto do negócio, regras e playbook por fase. Impacta custo indiretamente (mensagens mais longas ou mais chamadas ao modelo)."
      >
        <div className="space-y-6">
          <AiSettingsSubheading>Identidade do assistente</AiSettingsSubheading>
          <p className="text-xs text-slate-500">
            Nome e tom aparecem nas respostas ao cliente. Use quando quiser alinhar à marca (formal, comercial, suporte).
          </p>
        <FormField
          id="assistantName"
          label="Nome do assistente"
          htmlFor="assistantName"
          help="Apresentação ao cliente. Opcional; se vazio, o produto pode usar um nome padrão."
        >
          <input
            id="assistantName"
            type="text"
            value={assistantName}
            onChange={(e) => setAssistantName(e.target.value)}
            className="w-full max-w-md rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Ex.: Equipa DevFlow"
          />
        </FormField>
        <FormField
          id="tone"
          label="Tom de voz"
          htmlFor="tone"
          help="Afeta estilo e vocabulário. Comercial e suporte tendem a respostas mais longas; neutro é o mais previsível."
        >
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
        </div>

        <div className="space-y-4 border-t border-slate-100 pt-6">
          <AiSettingsSubheading>Contexto e objetivo</AiSettingsSubheading>
          <p className="text-xs text-slate-500">
            Isto substitui boa parte do «prompt» em linguagem natural: quem são vocês e o que a IA deve perseguir neste
            canal (ex.: qualificar antes de preço).
          </p>
          <FormField
            id="biz"
            label="O que a empresa faz"
            htmlFor="biz"
            help="Quando usar: sempre que o cliente não conheça o negócio. Impacto: respostas mais alinhadas à oferta real."
          >
            <textarea
              id="biz"
              value={businessContext}
              onChange={(e) => setBusinessContext(e.target.value)}
              rows={4}
              className={fieldTextareaClassName}
              placeholder="Produtos, público-alvo, canais…"
            />
          </FormField>
          <FormField
            id="goal"
            label="Objetivo da IA neste canal"
            htmlFor="goal"
            help="Quando usar: definir prioridade (vendas vs suporte). Impacto: orienta o próximo passo sugerido ao cliente."
          >
            <textarea
              id="goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={3}
              className={fieldTextareaClassName}
              placeholder="Ex.: qualificar leads e agendar demonstrações."
            />
          </FormField>
        </div>

        <div className="space-y-4 border-t border-slate-100 pt-6">
          <AiSettingsSubheading>Regras operacionais</AiSettingsSubheading>
          <p className="text-xs text-slate-500">
            Instruções curtas em lista. Impacto: reduz alucinação e mensagens fora da política da empresa.
          </p>
          <StringListEditor
            id="rules"
            label="Regras"
            values={rules}
            onChange={setRules}
            placeholder="Ex.: não prometer prazos sem confirmar"
          />
        </div>

        <div className="space-y-4 border-t border-slate-100 pt-6">
          <AiSettingsSubheading>Tópicos a evitar</AiSettingsSubheading>
          <p className="text-xs text-slate-500">
            A IA recusa ou desvia educadamente. Impacto: menos risco legal/reputacional; pode aumentar handoff se o cliente
            insistir.
          </p>
          <StringListEditor
            id="forbidden"
            label="Tópicos proibidos ou sensíveis"
            values={forbiddenTopics}
            onChange={setForbiddenTopics}
          />
        </div>

        <div className="space-y-4 border-t border-slate-100 pt-6">
          <AiSettingsSubheading>Playbook por fase do funil</AiSettingsSubheading>
          <p className="text-xs text-slate-500">
            Opcional: afinar objetivo e linhas por estágio (lead → fechado). Quando usar: funis claros com equipas
            diferentes por fase. Impacto: mensagens mais específicas por momento da conversa.
          </p>
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
        </div>
      </AiSettingsPhase>

      <AiSettingsPhase
        id="automacao"
        phase="3 · Automação"
        title="Respostas automáticas e texto fixo"
        description="Define se a IA envia mensagens sozinha e mensagens de cortesia. Impacto na operação: com auto-resposta desligada, a equipa trata tudo na Inbox."
      >
        <label className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3">
          <input
            type="checkbox"
            checked={autoReply}
            onChange={(e) => setAutoReply(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-[var(--df-brand-600)]"
          />
          <span className="text-sm font-medium text-slate-800">
            Responder automaticamente a mensagens recebidas
            <span className="mt-1 block text-xs font-normal text-slate-500">
              Quando usar: atendimento 24/7 com IA. Desligue se quiser só rascunhos ou revisão humana obrigatória. Impacto
              em custo: cada resposta automática conta no uso de IA do plano.
            </span>
          </span>
        </label>
        <FormField
          id="outOfHours"
          label="Resposta fora de horário (texto fixo)"
          htmlFor="outOfHours"
          help="Opcional. Mensagem curta quando não houver agente — o motor de horários pode evoluir noutro módulo. Impacto: cliente vê texto previsível sem gastar tokens de LLM."
        >
          <textarea
            id="outOfHours"
            value={outOfHoursReply}
            onChange={(e) => setOutOfHoursReply(e.target.value)}
            rows={3}
            className={fieldTextareaClassName}
            placeholder="Ex.: O nosso horário é… Voltamos em breve."
          />
        </FormField>
      </AiSettingsPhase>

      <AiSettingsPhase
        id="limites"
        phase="4 · Limites e segurança"
        title="Handoff, modelo e consumo"
        description="Gatilhos humanos, tamanho da resposta e temperatura influenciam segurança e custo. O comportamento em texto vem das fases anteriores (identidade, contexto, regras, funil)."
      >
        <label className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3">
          <input
            type="checkbox"
            checked={fallbackToHuman}
            onChange={(e) => setFallbackToHuman(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-[var(--df-brand-600)]"
          />
          <span className="text-sm font-medium text-slate-800">
            Preferir handoff para humano quando a IA não tiver confiança
            <span className="mt-1 block text-xs font-normal text-slate-500">
              Recomendado em vendas e suporte sensível. Impacto: menos risco de resposta fraca; pode aumentar carga na
              equipa.
            </span>
          </span>
        </label>
        <StringListEditor
          id="handoff"
          label="Gatilhos de transferência para humano"
          help="Quando usar: frases ou situações que exigem pessoa (reclamação grave, pedido explícito, negociação). Impacto: conversa deixa de ser só IA e entra na fila humana."
          values={handoffTriggers}
          onChange={setHandoffTriggers}
        />
        <GuardrailsSummary
          enabled={enabled}
          autoReply={autoReply}
          fallbackToHuman={fallbackToHuman}
          planName={planInfo?.plan_name}
          canUse={usageStatus?.can_use}
        />
        <details className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 ring-1 ring-slate-900/[0.03]">
          <summary className="cursor-pointer text-sm font-bold text-slate-900">
            Avançado — motor LLM e parâmetros de geração
          </summary>
          <div className="mt-4 space-y-4 border-t border-slate-200/80 pt-4">
            {planCaps && !planCaps.hasAdvancedAi && FEATURE_UPGRADE_COPY.ADVANCED_AI ? (
              <PricingContextHint message={FEATURE_UPGRADE_COPY.ADVANCED_AI} />
            ) : null}
            <p className="text-xs text-slate-600">
              Motor global do tenant: <strong>{tenantAiDriver ?? "não definido"}</strong>. Sobrescreva só se precisar de um
              fornecedor diferente só para esta IA de atendimento.
            </p>
            <FormField
              id="drv"
              label="Motor (override)"
              htmlFor="drv"
              help="Impacto: troca custo e latência (OpenAI vs Claude vs regras)."
            >
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
            <FormField
              id="model"
              label="Modelo"
              htmlFor="model"
              help="Modelos maiores: melhor qualidade, mais custo por mensagem."
            >
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
            <FormField id="temp" label="Temperatura" htmlFor="temp" help="Mais alto = mais variação e risco de desvio do script; mais baixo = mais previsível.">
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
            <FormField
              id="maxTok"
              label="Máximo de tokens na resposta"
              htmlFor="maxTok"
              help="Limite superior do tamanho da resposta. Mais tokens ≈ mensagens mais longas e maior custo."
            >
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
          </div>
        </details>
      </AiSettingsPhase>

      <AiSettingsPhase
        id="teste"
        phase="5 · Teste e validação"
        title="Simular mensagem do cliente"
        description="Usa o rascunho actual (inclui alterações não guardadas). Não envia WhatsApp real — ideal para validar tom e guardrails antes da Inbox."
      >
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-900" htmlFor="testMsg">
              Mensagem do cliente (entrada)
            </label>
            <p className="text-xs text-slate-500">
              Escreva o que um cliente típico enviaria. Isto não fica guardado — só serve à simulação.
            </p>
            <textarea
              id="testMsg"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              rows={5}
              className={`${fieldTextareaClassName} rounded-2xl rounded-tl-md border-slate-200/90 bg-slate-50/90`}
              placeholder="Ex.: Olá, quanto custa o plano anual?"
            />
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-900">Resposta simulada da IA</p>
            <p className="text-xs text-slate-500">Pré-visualização do texto que o cliente veria (quando permitido pelos guards).</p>
            <div className="min-h-[8rem] rounded-2xl rounded-tr-md border border-[var(--df-brand-200)]/90 bg-[var(--df-brand-50)]/90 p-4 text-sm text-slate-900 shadow-sm ring-1 ring-[var(--df-brand-100)]/80">
              {testLoading ? (
                <div className="flex flex-col gap-2 animate-pulse">
                  <p className="text-xs font-medium text-[var(--df-brand-800)]">A gerar resposta…</p>
                  <div className="h-3 w-[80%] rounded bg-[var(--df-brand-200)]/50" />
                  <div className="h-3 w-full rounded bg-[var(--df-brand-200)]/40" />
                  <div className="h-3 w-2/3 rounded bg-[var(--df-brand-200)]/35" />
                </div>
              ) : testRun ? (
                <p className="whitespace-pre-wrap leading-relaxed">
                  {testRun.reply?.trim() ? testRun.reply : "— Sem texto gerado (ver detalhes abaixo)."}
                </p>
              ) : (
                <p className="text-slate-500">
                  Clique em «Testar resposta» para ver a saída aqui. Nada é enviado ao WhatsApp.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-6">
          <button
            type="button"
            className={buttonClassName("primary")}
            disabled={testLoading}
            onClick={handleTest}
          >
            {testLoading ? "A gerar…" : "Testar resposta"}
          </button>
          <Link href="/inbox" className={`${buttonClassName("secondary")} inline-flex`}>
            Abrir Inbox
          </Link>
        </div>

        {testError ? (
          <div
            className="rounded-xl border border-amber-200/90 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm"
            role="alert"
          >
            <p className="font-semibold">Não foi possível concluir a simulação</p>
            <p className="mt-1 text-amber-900/95">{testError}</p>
            <p className="mt-2 text-xs text-amber-800/90">
              Verifique o motor em Configurações, a ligação à rede e tente outra vez. Os dados do formulário não foram
              gravados por isto.
            </p>
          </div>
        ) : null}

        {recentTestSnapshots.length > 0 ? (
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 text-xs text-slate-600">
            <p className="font-semibold text-slate-800">Testes recentes (nesta sessão)</p>
            <ul className="mt-2 space-y-2">
              {recentTestSnapshots.map((s, i) => (
                <li key={`${s.at}-${i}`} className="border-b border-slate-100/80 pb-2 last:border-0 last:pb-0">
                  <span className="text-slate-500">{new Date(s.at).toLocaleTimeString("pt-BR", { timeStyle: "short" })}</span>
                  <span className="mx-2 text-slate-300">·</span>
                  <span className="line-clamp-2 text-slate-700">{s.reply || "(sem texto)"}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {testRun ? (
          <details className="rounded-xl border border-slate-200/90 bg-white p-4 text-sm ring-1 ring-slate-900/[0.03]">
            <summary className="cursor-pointer font-semibold text-slate-800">Detalhes técnicos da simulação</summary>
            <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Decisão (guard)</p>
                <p className="mt-1 font-medium text-slate-900">
                  {testRun.decision.allow ? "Permitido" : "Bloqueado / handoff"}
                </p>
                <p className="mt-1 text-xs text-slate-600">{testRun.decision.reason}</p>
                {testRun.decision.confidence != null ? (
                  <p className="mt-1 text-xs text-slate-500">Confiança: {testRun.decision.confidence}</p>
                ) : null}
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Estado (funil)</p>
                <p className="mt-1 font-mono text-sm font-semibold text-slate-900">{testRun.state}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Execução</p>
                <ul className="mt-1 space-y-0.5 text-slate-800">
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
                  <li>
                    <span className="text-slate-500">Fallback:</span>{" "}
                    <strong>{testRun.fallback ? "sim" : "não"}</strong>
                  </li>
                </ul>
              </div>
              {testRun.error ? (
                <div className="sm:col-span-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Nota do motor</p>
                  <p className="mt-1 rounded-md border border-amber-200/80 bg-amber-50 px-2 py-1.5 text-xs text-amber-950">
                    {testRun.error}
                  </p>
                </div>
              ) : null}
            </div>
          </details>
        ) : null}
      </AiSettingsPhase>

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
