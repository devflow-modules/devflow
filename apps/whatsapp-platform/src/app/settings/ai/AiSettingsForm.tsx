"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@devflow/ui";
import { DEFAULT_SYSTEM_PROMPT } from "@/modules/ai/openai";
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

type Tone = "FRIENDLY" | "SALES" | "SUPPORT" | "NEUTRAL";

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
};

const MODELS = [
  { value: "gpt-4o-mini", label: "gpt-4o-mini (rápido, econômico)" },
  { value: "gpt-4o", label: "gpt-4o (mais capaz)" },
] as const;

const TONES: { value: Tone; label: string }[] = [
  { value: "FRIENDLY", label: "Amigável" },
  { value: "SALES", label: "Comercial" },
  { value: "SUPPORT", label: "Suporte" },
  { value: "NEUTRAL", label: "Neutro" },
];

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

export function AiSettingsForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [model, setModel] = useState("gpt-4o-mini");
  const [tone, setTone] = useState<Tone>("NEUTRAL");
  const [maxTokens, setMaxTokens] = useState(220);
  const [temperature, setTemperature] = useState(0.4);
  const [usageStatus, setUsageStatus] = useState<UsageStatus | null>(null);
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);

  const load = useCallback(async () => {
    try {
      const [rConfig, rStatus, rPlan] = await Promise.all([
        fetchProtected("/api/ai/config"),
        fetchProtected("/api/billing/ai-usage-status"),
        fetchProtected("/api/billing/ai-plan"),
      ]);
      const j = (await rConfig.json().catch(() => ({}))) as {
        data?: AiCfg;
        error?: string;
        success?: boolean;
      };
      if (!rConfig.ok) {
        setError(protectedApiUserMessage(rConfig.status, j));
        return;
      }
      const d = j.data;
      if (d) {
        setEnabled(d.enabled);
        setSystemPrompt(d.systemPrompt ?? "");
        setModel(d.model ?? "gpt-4o-mini");
        setTone(d.tone ?? "NEUTRAL");
        setMaxTokens(clamp(d.maxTokens ?? 220, 50, 500));
        setTemperature(clamp(d.temperature ?? 0.4, 0, 1));
      }
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
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetchProtected("/api/ai/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          systemPrompt,
          model,
          tone,
          maxTokens: clamp(maxTokens, 50, 500),
          temperature: clamp(temperature, 0, 1),
          fallbackToHuman: true,
        }),
      });
      const errBody = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(protectedApiUserMessage(res.status, errBody));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    } finally {
      setSaving(false);
    }
  }

  function handleResetPrompt() {
    setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
  }

  if (loading) {
    return <StateLoading message="A carregar configuração de IA…" />;
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <FormSection
        title="Estado da IA"
        description="Ligue ou desligue as respostas automáticas. O consumo conta para o plano."
      >
        <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3">
          <input
            id="ai-enabled"
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-[var(--df-brand-600)] focus:ring-[var(--df-brand-500)]"
          />
          <label htmlFor="ai-enabled" className="text-sm font-medium leading-snug text-slate-800">
            Ativar respostas automáticas por IA no WhatsApp
          </label>
        </div>
        <AiStatusBanner
          state={getBannerState(enabled, usageStatus)}
          enabled={enabled}
          used={usageStatus?.used}
          limit={usageStatus?.limit ?? undefined}
          percentUsed={usageStatus?.percent_used ?? undefined}
          planName={planInfo?.plan_name}
        />
      </FormSection>

      <FormSection
        title="Prompt do sistema"
        description="Instruções fixas que definem tom, limites e o que a IA pode ou não fazer."
      >
        <textarea
          id="prompt"
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={12}
          className={`${fieldTextareaClassName} font-mono text-[13px] leading-relaxed`}
          placeholder="Instruções de como a IA deve responder…"
        />
        <div className="pt-1">
          <Button type="button" variant="outline" size="sm" onClick={handleResetPrompt}>
            Repor texto padrão
          </Button>
        </div>
      </FormSection>

      <FormSection title="Modelo e comportamento" description="Ajuste fino do modelo OpenAI configurado no ambiente.">
        <FormField id="model" label="Modelo" htmlFor="model">
          <select
            id="model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className={`max-w-md ${fieldSelectClassName}`}
          >
            {MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField id="tone" label="Tom" htmlFor="tone">
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

        <FormField
          id="temp"
          label="Temperatura"
          htmlFor="temp"
          help="Valores baixos = respostas mais previsíveis; mais altos = mais variação."
        >
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
          label="Limite de tokens na resposta"
          htmlFor="maxTok"
          help="Entre 50 e 500. Afeta o tamanho máximo do texto gerado."
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
      </FormSection>

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
