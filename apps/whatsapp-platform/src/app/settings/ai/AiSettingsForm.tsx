"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AiStatusBanner, type AiBannerState } from "@/components/ai/AiStatusBanner";
import { StateError, StateLoading } from "@/components/ui/app-states";
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
import { isWhiteLabelMode } from "@/lib/productMode";
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
        <label className="text-sm font-medium text-[var(--df-text-primary)]" htmlFor={id}>
          {label}
        </label>
        {help ? <p className="mt-0.5 text-xs text-[var(--df-text-muted)]">{help}</p> : null}
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
              className="flex-1 rounded-lg border df-border-brand bg-[var(--df-bg-elevated)] px-3 py-2 text-sm text-[var(--df-text-primary)] shadow-sm focus:border-[var(--df-brand-500)] focus:outline-none focus:ring-2 focus:ring-[var(--df-brand-500)]/25"
            />
            <Button variant="secondary"
              type="button"
              className={buttonClassName("secondary", "shrink-0 px-2 text-xs")}
              onClick={() => onChange(values.filter((_, j) => j !== i))}
            >
              Remover
            </Button>
          </li>
        ))}
      </ul>
      <Button variant="secondary"
        type="button"
        className={buttonClassName("secondary", "text-sm")}
        onClick={() => onChange([...values, ""])}
      >
        Adicionar linha
      </Button>
    </div>
  );
}

function IaCrossLinks() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Link
        href="/settings"
        className="group rounded-xl border df-border-brand bg-[color-mix(in_srgb,var(--df-bg-app)_50%,var(--df-bg-elevated))] p-4 text-left shadow-sm transition hover:border-[var(--df-brand-300)] hover:bg-[var(--df-brand-50)]/40"
      >
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--df-text-muted)]">Motor</p>
        <p className="mt-1 text-sm font-semibold text-[var(--df-text-primary)] group-hover:text-[var(--df-brand-900)]">
          Configurações gerais
        </p>
        <p className="mt-1 text-xs text-[var(--df-text-secondary)]">OpenAI, Claude ou só regras</p>
      </Link>
      <Link
        href="/settings/ai-analytics"
        className="group rounded-xl border df-border-brand bg-[color-mix(in_srgb,var(--df-bg-app)_50%,var(--df-bg-elevated))] p-4 text-left shadow-sm transition hover:border-[var(--df-brand-300)] hover:bg-[var(--df-brand-50)]/40"
      >
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--df-text-muted)]">Consumo</p>
        <p className="mt-1 text-sm font-semibold text-[var(--df-text-primary)] group-hover:text-[var(--df-brand-900)]">
          Uso e custo de IA
        </p>
        <p className="mt-1 text-xs text-[var(--df-text-secondary)]">Tokens, limites do plano</p>
      </Link>
      <Link
        href="/dashboard/ai"
        className="group rounded-xl border df-border-brand bg-[color-mix(in_srgb,var(--df-bg-app)_50%,var(--df-bg-elevated))] p-4 text-left shadow-sm transition hover:border-[var(--df-brand-300)] hover:bg-[var(--df-brand-50)]/40"
      >
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--df-text-muted)]">Operação</p>
        <p className="mt-1 text-sm font-semibold text-[var(--df-text-primary)] group-hover:text-[var(--df-brand-900)]">
          Painel IA no atendimento
        </p>
        <p className="mt-1 text-xs text-[var(--df-text-secondary)]">Saúde, funil e eventos recentes</p>
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
  const wl = isWhiteLabelMode();
  return (
    <div className="rounded-xl border df-border-brand bg-gradient-to-br from-[color-mix(in_srgb,var(--df-bg-app)_55%,var(--df-bg-elevated))] to-[var(--df-bg-elevated)] p-4 text-sm text-[var(--df-text-secondary)] ring-1 ring-[color-mix(in_srgb,var(--df-border-dark)_75%,transparent)]">
      <p className="font-semibold text-[var(--df-text-primary)]">Guardrails e handoff (resumo)</p>
      <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
        <li>
          <strong className="text-[var(--df-text-primary)]">Quando a IA pode responder:</strong> espaço com IA ativada, resposta
          automática ligada, decisão dos guards a permitir e{" "}
          {canUse === false ? (
            <span className="text-amber-800">
              {wl ? "capacidade de IA da operação esgotada ou bloqueada" : "quota do plano esgotada ou bloqueada"}
            </span>
          ) : (
            <span>{wl ? "margem de capacidade disponível para a operação" : "quota disponível no plano"}</span>
          )}
          {!wl && planName ? (
            <>
              {" "}
              (<span className="whitespace-nowrap">plano {planName}</span>)
            </>
          ) : null}
          .
        </li>
        <li>
          <strong className="text-[var(--df-text-primary)]">Quando não responde sozinha:</strong>{" "}
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
          <strong className="text-[var(--df-text-primary)]">Atendimento humano preferencial:</strong>{" "}
          {fallbackToHuman
            ? "com baixa confiança ou bloqueio, o fluxo favorece transferência para humano (conforme automação)."
            : "desligado — reveja risco de respostas menos seguras em casos ambíguos."}
        </li>
        <li>
          <strong className="text-[var(--df-text-primary)]">Erro ou indisponibilidade:</strong> a conversa pode ficar sem resposta
          automática; o painel de operação mostra fallbacks e erros para acompanhar.
        </li>
      </ul>
    </div>
  );
}

export function AiSettingsForm() {
  const [loading, setLoading] = useState(true);
  /** Carregamento inicial de `/api/ai/config` bem-sucedido (evita formulário “vazio” com erro no fim da página). */
  const [loadSucceeded, setLoadSucceeded] = useState(false);
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
    setError(null);
    setLoadSucceeded(false);
    try {
      const [rConfig, rStatus, rPlan] = await Promise.all([
        fetchProtected("/api/ai/config"),
        fetchProtected("/api/billing/ai-usage-status"),
        isWhiteLabelMode()
          ? Promise.resolve({ ok: false } as Response)
          : fetchProtected("/api/billing/ai-plan"),
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
      setLoadSucceeded(true);
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
      setError("Erro de conexão. Verifique a rede e tente novamente.");
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

  if (!loadSucceeded && error) {
    return (
      <StateError
        title="Não foi possível carregar as definições"
        message={error}
        retryLabel="Tentar novamente"
        onRetry={() => {
          setLoading(true);
          void load();
        }}
      />
    );
  }

  return (
    <form id="wf-ai-settings" onSubmit={handleSubmit} className="max-w-3xl space-y-10">
      {error ? (
        <div className="rounded-xl border border-red-200/90 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </div>
      ) : null}
      <div className="space-y-3">
        <AiSettingsAnchorNav />
        <AiStatusSummary enabled={enabled} autoReply={autoReply} motorLabel={formatMotorLabel(previewDriver)} />
      </div>

      <AiSettingsPhase
        id="visao-geral"
        phase="1 · Visão geral"
        title="Estado, motor e atalhos"
        description="Ligações rápidas para o motor (fornecedor LLM), consumo e painel operacional. Isto é a IA base do workspace; cada canal pode herdar ou sobrescrever propósito, auto-resposta e perfil de IA em Admin · WhatsApp. Depois afinamos comportamento → automação → limites → teste."
      >
        <IaCrossLinks />
        {driver ? (
          <p className="text-xs text-[var(--df-text-secondary)]">
            <span className="df-badge whitespace-nowrap">Override de motor só nesta IA</span>
          </p>
        ) : null}
        <FieldHelp>
          O fornecedor base (OpenAI, Claude ou só regras) define-se em{" "}
          <Link href="/settings" className="font-semibold text-[var(--df-brand-700)] hover:underline">
            Configurações gerais
          </Link>
          . Aqui pode sobrescrever só para esta{" "}
          <strong className="font-semibold text-[var(--df-text-primary)]">IA base</strong> (workspace) na secção «Limites e
          segurança» (avançado); canais podem ainda ter overrides próprios.
        </FieldHelp>
        <label className="flex items-start gap-3 rounded-xl border df-border-brand bg-[color-mix(in_srgb,var(--df-bg-app)_50%,var(--df-bg-elevated))] px-4 py-3">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-[color-mix(in_srgb,var(--df-border-dark)_85%,var(--df-border-subtle))] text-[var(--df-brand-600)]"
          />
          <span className="text-sm font-medium text-[var(--df-text-primary)]">
            IA ativada para o espaço de trabalho
            <span className="mt-1 block text-xs font-normal text-[var(--df-text-muted)]">
              Sem isto, nenhuma resposta automática por IA é enviada a partir desta base, mesmo com regras ou prompt
              preenchidos. Ajustes por linha seguem o que estiver definido em cada canal.
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
        <div className="rounded-xl border border-dashed df-border-brand bg-[color-mix(in_srgb,var(--df-bg-elevated)_78%,transparent)] px-4 py-3 text-sm text-[var(--df-text-secondary)]">
          <p className="font-semibold text-[var(--df-text-primary)]">Ordem sugerida de configuração</p>
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
                  className={`flex flex-col rounded-xl border bg-[var(--df-bg-elevated)] p-4 text-left shadow-sm transition ${
                    selected
                      ? "border-[var(--df-brand-400)] ring-2 ring-[var(--df-brand-200)]/80"
                      : "border df-border-brand ring-1 ring-[color-mix(in_srgb,var(--df-border-dark)_75%,transparent)]"
                  }`}
                >
                  <p className="text-sm font-bold text-[var(--df-text-primary)]">{p.label}</p>
                  <p className="mt-1 flex-1 text-xs leading-relaxed text-[var(--df-text-secondary)]">{p.description}</p>
                  <Button variant="secondary"
                    type="button"
                    className={buttonClassName("secondary", "mt-3 w-full justify-center text-sm")}
                    onClick={() => applyPreset(p)}
                  >
                    Aplicar
                  </Button>
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
        description="Isto molda o texto que o cliente lê: tom, contexto do negócio, regras e playbook por fase. Os canais herdam estes parâmetros como padrão; podem combinar com propósito e perfil de IA próprios por linha. Impacta custo indiretamente (mensagens mais longas ou mais chamadas ao modelo)."
      >
        <div className="space-y-6">
          <AiSettingsSubheading>Identidade do assistente</AiSettingsSubheading>
          <p className="text-xs text-[var(--df-text-muted)]">
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
            className="w-full max-w-md rounded-lg border df-border-brand px-3 py-2 text-sm"
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

        <div className="space-y-4 border-t df-border-brand pt-6">
          <AiSettingsSubheading>Contexto e objetivo</AiSettingsSubheading>
          <p className="text-xs text-[var(--df-text-muted)]">
            Isto substitui boa parte do «prompt» em linguagem natural: quem são vocês e o que a IA deve perseguir no
            WhatsApp (ex.: qualificar antes de preço). O <strong className="font-semibold text-[var(--df-text-primary)]">propósito</strong>{" "}
            específico de cada linha (Atendimento, Prospecção, etc.) pode ser definido ou refinado por canal.
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

        <div className="space-y-4 border-t df-border-brand pt-6">
          <AiSettingsSubheading>Regras operacionais</AiSettingsSubheading>
          <p className="text-xs text-[var(--df-text-muted)]">
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

        <div className="space-y-4 border-t df-border-brand pt-6">
          <AiSettingsSubheading>Tópicos a evitar</AiSettingsSubheading>
          <p className="text-xs text-[var(--df-text-muted)]">
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

        <div className="space-y-4 border-t df-border-brand pt-6">
          <AiSettingsSubheading>Playbook por fase do funil</AiSettingsSubheading>
          <p className="text-xs text-[var(--df-text-muted)]">
            Opcional: afinar objetivo e linhas por estágio (lead → fechado). Quando usar: funis claros com equipas
            diferentes por fase. Impacto: mensagens mais específicas por momento da conversa.
          </p>
        <div className="space-y-6">
          {FUNNEL_STAGES.map((stage) => (
            <div
              key={stage}
              className="rounded-xl border df-border-brand bg-[color-mix(in_srgb,var(--df-bg-app)_48%,var(--df-bg-elevated))] px-4 py-3"
            >
              <p className="text-sm font-bold text-[var(--df-text-primary)]">{STAGE_LABELS[stage]}</p>
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
                  className="w-full rounded-lg border df-border-brand px-3 py-2 text-sm"
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
        description="Define se a IA envia mensagens sozinha e mensagens de cortesia a partir desta base. Por canal, a resposta automática pode ser sobrescrita sem alterar o padrão global. Impacto na operação: com auto-resposta desligada aqui, a equipa trata tudo na Inbox salvo override no canal."
      >
        <label className="flex items-start gap-3 rounded-xl border df-border-brand bg-[color-mix(in_srgb,var(--df-bg-app)_50%,var(--df-bg-elevated))] px-4 py-3">
          <input
            type="checkbox"
            checked={autoReply}
            onChange={(e) => setAutoReply(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-[color-mix(in_srgb,var(--df-border-dark)_85%,var(--df-border-subtle))] text-[var(--df-brand-600)]"
          />
          <span className="text-sm font-medium text-[var(--df-text-primary)]">
            Responder automaticamente a mensagens recebidas
            <span className="mt-1 block text-xs font-normal text-[var(--df-text-muted)]">
              Quando usar: atendimento 24/7 com IA na base. Desligue se quiser só rascunhos ou revisão humana obrigatória
              por omissão. Cada linha pode afinar se responde sozinha. Impacto em custo: cada resposta automática conta no
              uso de IA do plano.
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
        <label className="flex items-start gap-3 rounded-xl border df-border-brand bg-[color-mix(in_srgb,var(--df-bg-app)_50%,var(--df-bg-elevated))] px-4 py-3">
          <input
            type="checkbox"
            checked={fallbackToHuman}
            onChange={(e) => setFallbackToHuman(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-[color-mix(in_srgb,var(--df-border-dark)_85%,var(--df-border-subtle))] text-[var(--df-brand-600)]"
          />
          <span className="text-sm font-medium text-[var(--df-text-primary)]">
            Preferir handoff para humano quando a IA não tiver confiança
            <span className="mt-1 block text-xs font-normal text-[var(--df-text-muted)]">
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
        <details className="rounded-xl border df-border-brand bg-[color-mix(in_srgb,var(--df-bg-app)_50%,var(--df-bg-elevated))] p-4 ring-1 ring-[color-mix(in_srgb,var(--df-border-dark)_75%,transparent)]">
          <summary className="cursor-pointer text-sm font-bold text-[var(--df-text-primary)]">
            Avançado — motor LLM e parâmetros de geração
          </summary>
          <div className="mt-4 space-y-4 border-t df-border-brand pt-4">
            {planCaps && !planCaps.hasAdvancedAi && FEATURE_UPGRADE_COPY.ADVANCED_AI ? (
              <PricingContextHint message={FEATURE_UPGRADE_COPY.ADVANCED_AI} />
            ) : null}
            <p className="text-xs text-[var(--df-text-secondary)]">
              Motor global do tenant: <strong>{tenantAiDriver ?? "não definido"}</strong>. Sobrescreva só se precisar de um
              fornecedor diferente só para esta IA base (workspace); canais com perfil de IA próprio usam a resolução
              definida no admin de canais.
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
                <span className="tabular-nums text-sm font-semibold text-[var(--df-text-secondary)]">{temperature}</span>
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
                <span className="tabular-nums text-sm font-semibold text-[var(--df-text-secondary)]">{maxTokens}</span>
              </div>
            </FormField>
          </div>
        </details>
      </AiSettingsPhase>

      <AiSettingsPhase
        id="teste"
        phase="5 · Teste e validação"
        title="Simular mensagem do cliente"
        description="Usa o rascunho actual desta IA base (inclui alterações não guardadas). Não envia WhatsApp real — ideal para validar tom e guardrails. Na Inbox, conversas reais podem refletir overrides de propósito, auto-resposta ou perfil por canal."
      >
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
          <div className="space-y-3">
            <label className="text-sm font-semibold text-[var(--df-text-primary)]" htmlFor="testMsg">
              Mensagem do cliente (entrada)
            </label>
            <p className="text-xs text-[var(--df-text-muted)]">
              Escreva o que um cliente típico enviaria. Isto não fica guardado — só serve à simulação.
            </p>
            <textarea
              id="testMsg"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              rows={5}
              className={`${fieldTextareaClassName} rounded-2xl rounded-tl-md border df-border-brand bg-[color-mix(in_srgb,var(--df-bg-app)_55%,var(--df-bg-elevated))]`}
              placeholder="Ex.: Olá, quanto custa o plano anual?"
            />
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-[var(--df-text-primary)]">Resposta simulada da IA</p>
            <p className="text-xs text-[var(--df-text-muted)]">Pré-visualização do texto que o cliente veria (quando permitido pelos guards).</p>
            <div className="min-h-[8rem] rounded-2xl rounded-tr-md border border-[var(--df-brand-200)]/90 bg-[var(--df-brand-50)]/90 p-4 text-sm text-[var(--df-text-primary)] shadow-sm ring-1 ring-[var(--df-brand-100)]/80">
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
                <p className="text-[var(--df-text-muted)]">
                  Clique em «Testar resposta» para ver a saída aqui. Nada é enviado ao WhatsApp.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t df-border-brand pt-6">
          <Button variant="disabled"
            type="button"
            className={buttonClassName("primary")}
            disabled={testLoading}
            onClick={handleTest}
          >
            {testLoading ? "A gerar…" : "Testar resposta"}
          </Button>
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
          <div className="rounded-xl border df-border-brand bg-[color-mix(in_srgb,var(--df-bg-app)_50%,var(--df-bg-elevated))] px-4 py-3 text-xs text-[var(--df-text-secondary)]">
            <p className="font-semibold text-[var(--df-text-primary)]">Testes recentes (nesta sessão)</p>
            <ul className="mt-2 space-y-2">
              {recentTestSnapshots.map((s, i) => (
                <li key={`${s.at}-${i}`} className="border-b df-border-brand pb-2 last:border-0 last:pb-0">
                  <span className="text-[var(--df-text-muted)]">{new Date(s.at).toLocaleTimeString("pt-BR", { timeStyle: "short" })}</span>
                  <span className="mx-2 text-[color-mix(in_srgb,var(--df-text-muted)_40%,transparent)]">·</span>
                  <span className="line-clamp-2 text-[var(--df-text-secondary)]">{s.reply || "(sem texto)"}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {testRun ? (
          <details className="rounded-xl border df-border-brand bg-[var(--df-bg-elevated)] p-4 text-sm ring-1 ring-[color-mix(in_srgb,var(--df-border-dark)_75%,transparent)]">
            <summary className="cursor-pointer font-semibold text-[var(--df-text-primary)]">Detalhes técnicos da simulação</summary>
            <div className="mt-4 grid gap-4 border-t df-border-brand pt-4 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--df-text-muted)]">Decisão (guard)</p>
                <p className="mt-1 font-medium text-[var(--df-text-primary)]">
                  {testRun.decision.allow ? "Permitido" : "Bloqueado / handoff"}
                </p>
                <p className="mt-1 text-xs text-[var(--df-text-secondary)]">{testRun.decision.reason}</p>
                {testRun.decision.confidence != null ? (
                  <p className="mt-1 text-xs text-[var(--df-text-muted)]">Confiança: {testRun.decision.confidence}</p>
                ) : null}
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--df-text-muted)]">Estado (funil)</p>
                <p className="mt-1 font-mono text-sm font-semibold text-[var(--df-text-primary)]">{testRun.state}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--df-text-muted)]">Execução</p>
                <ul className="mt-1 space-y-0.5 text-[var(--df-text-primary)]">
                  <li>
                    <span className="text-[var(--df-text-muted)]">Motor:</span> {testRun.usedDriver}
                  </li>
                  <li>
                    <span className="text-[var(--df-text-muted)]">Modelo:</span> {testRun.usedModel || "—"}
                  </li>
                  <li>
                    <span className="text-[var(--df-text-muted)]">Latência:</span>{" "}
                    <span className="tabular-nums font-semibold">{testRun.latencyMs} ms</span>
                  </li>
                  <li>
                    <span className="text-[var(--df-text-muted)]">Fallback:</span>{" "}
                    <strong>{testRun.fallback ? "sim" : "não"}</strong>
                  </li>
                </ul>
              </div>
              {testRun.error ? (
                <div className="sm:col-span-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--df-text-muted)]">Nota do motor</p>
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
        <p className="text-xs text-[var(--df-text-muted)]">
          Versão {configVersion} · última alteração {new Date(updatedAt).toLocaleString("pt-BR")}
        </p>
      ) : null}

      <FormActions>
        <Button variant="primary" type="submit" disabled={saving}>
          {saving ? "A guardar…" : "Guardar alterações"}
        </Button>
        <Link href="/settings" className={buttonClassName("secondary")}>
          Voltar às configurações
        </Link>
      </FormActions>
    </form>
  );
}
