"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@devflow/ui";
import { DEFAULT_SYSTEM_PROMPT } from "@/modules/ai/openai";
import { AiStatusBanner, type AiBannerState } from "@/components/ai/AiStatusBanner";

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

function getBannerState(
  enabled: boolean,
  usageStatus: UsageStatus | null
): AiBannerState {
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
        fetch("/api/ai/config", { credentials: "include" }),
        fetch("/api/billing/ai-usage-status", { credentials: "include" }),
        fetch("/api/billing/ai-plan", { credentials: "include" }),
      ]);
      if (!rConfig.ok) {
        if (rConfig.status === 401) setError("Faça login para continuar.");
        else setError("Falha ao carregar");
        return;
      }
      const j = await rConfig.json();
      const d = j.data as AiCfg;
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
      const res = await fetch("/api/ai/config", {
        method: "PUT",
        credentials: "include",
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
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Falha ao salvar");
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
    return <p className="text-slate-600">Carregando…</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {/* Card: Status da IA */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 mb-3">Status da IA</h2>
        <div className="flex items-center gap-3">
          <input
            id="ai-enabled"
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          <label htmlFor="ai-enabled" className="text-sm font-medium text-slate-800">
            Ativar respostas automáticas por IA
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
      </div>

      {/* Card: Prompt */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 mb-3">Prompt do sistema</h2>
        <textarea
          id="prompt"
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={10}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm font-mono"
          placeholder="Instruções de como a IA deve responder..."
        />
        <div className="mt-2 flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleResetPrompt}>
            Resetar para padrão
          </Button>
        </div>
      </div>

      {/* Card: Configuração */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 mb-3">Configuração</h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="model" className="block text-sm font-medium text-slate-700 mb-1">
              Modelo
            </label>
            <select
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full max-w-md rounded border border-slate-300 px-3 py-2 text-sm"
            >
              {MODELS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="tone" className="block text-sm font-medium text-slate-700 mb-1">
              Tom
            </label>
            <select
              id="tone"
              value={tone}
              onChange={(e) => setTone(e.target.value as Tone)}
              className="w-full max-w-xs rounded border border-slate-300 px-3 py-2 text-sm"
            >
              {TONES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="temp" className="block text-sm font-medium text-slate-700 mb-1">
              Temperatura — 0.2 = mais preciso, 0.7 = mais criativo
            </label>
            <input
              id="temp"
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
              className="w-full max-w-xs"
            />
            <span className="ml-2 text-sm text-slate-600">{temperature}</span>
          </div>

          <div>
            <label htmlFor="maxTok" className="block text-sm font-medium text-slate-700 mb-1">
              Limite de resposta (tokens) — 50 a 500
            </label>
            <input
              id="maxTok"
              type="range"
              min={50}
              max={500}
              step={10}
              value={maxTokens}
              onChange={(e) => setMaxTokens(Number(e.target.value))}
              className="w-full max-w-xs"
            />
            <span className="ml-2 text-sm text-slate-600">{maxTokens}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Salvando…" : "Salvar"}
        </Button>
        <Link
          href="/settings"
          className="inline-flex items-center rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          Voltar
        </Link>
      </div>
    </form>
  );
}
