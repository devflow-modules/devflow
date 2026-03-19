"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@devflow/ui";

type Tone = "FRIENDLY" | "SALES" | "SUPPORT" | "NEUTRAL";

type AiCfg = {
  enabled: boolean;
  systemPrompt: string;
  tone: Tone;
  maxTokens: number;
  temperature: number;
  fallbackToHuman: boolean;
};

const TONES: { value: Tone; label: string }[] = [
  { value: "FRIENDLY", label: "Amigável" },
  { value: "SALES", label: "Comercial" },
  { value: "SUPPORT", label: "Suporte" },
  { value: "NEUTRAL", label: "Neutro" },
];

export function AiSettingsForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [tone, setTone] = useState<Tone>("NEUTRAL");
  const [maxTokens, setMaxTokens] = useState(512);
  const [temperature, setTemperature] = useState(0.7);

  useEffect(() => {
    let c = false;
    (async () => {
      try {
        const res = await fetch("/api/ai/config", { credentials: "include" });
        if (!res.ok) {
          if (res.status === 401) setError("Faça login para continuar.");
          else setError("Falha ao carregar");
          return;
        }
        const j = await res.json();
        const d = j.data as AiCfg;
        if (!c && d) {
          setEnabled(d.enabled);
          setSystemPrompt(d.systemPrompt ?? "");
          setTone(d.tone ?? "NEUTRAL");
          setMaxTokens(d.maxTokens ?? 512);
          setTemperature(d.temperature ?? 0.7);
        }
      } catch {
        if (!c) setError("Erro de conexão");
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/ai/config", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          systemPrompt,
          tone,
          maxTokens,
          temperature,
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

  if (loading) {
    return <p className="text-slate-600">Carregando…</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
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

      <div>
        <label htmlFor="prompt" className="block text-sm font-medium text-slate-700 mb-1">
          Prompt do sistema
        </label>
        <textarea
          id="prompt"
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={8}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm font-mono"
          placeholder="Ex.: Você é o atendente da loja X. Responda dúvidas sobre produtos, prazos e troca."
        />
        <p className="mt-1 text-xs text-slate-500">
          Obrigatório para IA ativa. Não inclua segredos; o prompt fica no servidor.
        </p>
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

      <div className="grid grid-cols-2 gap-4 max-w-md">
        <div>
          <label htmlFor="maxTok" className="block text-sm font-medium text-slate-700 mb-1">
            Max tokens
          </label>
          <input
            id="maxTok"
            type="number"
            min={64}
            max={4096}
            value={maxTokens}
            onChange={(e) => setMaxTokens(Number(e.target.value) || 512)}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="temp" className="block text-sm font-medium text-slate-700 mb-1">
            Temperature
          </label>
          <input
            id="temp"
            type="number"
            step={0.1}
            min={0}
            max={2}
            value={temperature}
            onChange={(e) => setTemperature(Number(e.target.value) || 0.7)}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {error && <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Salvando…" : "Salvar"}
        </Button>
        <Link
          href="/settings"
          className="inline-flex items-center rounded border border-slate-300 px-4 py-2 text-sm text-slate-700"
        >
          Voltar
        </Link>
      </div>
    </form>
  );
}
