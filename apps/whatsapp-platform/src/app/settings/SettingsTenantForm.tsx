"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@devflow/ui";

const AI_DRIVERS = [
  { value: "ruleBased", label: "Apenas regras (sem LLM)" },
  { value: "openAI", label: "OpenAI (GPT)" },
  { value: "claude", label: "Claude (Anthropic)" },
] as const;

type TenantMe = {
  id: string;
  name: string | null;
  aiDriver: string | null;
  phoneNumberId: string | null;
  hasApiKey: boolean;
};

export function SettingsTenantForm() {
  const [tenant, setTenant] = useState<TenantMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiDriver, setAiDriver] = useState<string>("ruleBased");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/tenants/me", { credentials: "include" });
        if (!res.ok) {
          if (res.status === 401) setTenant(null);
          else setError("Falha ao carregar configurações");
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setTenant(data);
          setAiDriver(data.aiDriver ?? "ruleBased");
        }
      } catch {
        if (!cancelled) setError("Erro de conexão");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tenant) return;
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/tenants/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ aiDriver: aiDriver || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Falha ao salvar");
      }
      const data = await res.json();
      setTenant((prev) => (prev ? { ...prev, aiDriver: data.aiDriver } : null));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <p className="text-slate-600">Carregando…</p>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen p-6">
        <h1 className="text-2xl font-semibold mb-4">Configurações</h1>
        <Link href="/dashboard" className="text-blue-600 underline">
          Voltar ao Dashboard
        </Link>
        <p className="mt-4 text-gray-600">
          Faça login para ver e alterar as configurações do tenant.
        </p>
        <Link href="/login" className="mt-2 inline-block text-blue-600 underline">
          Ir para login
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <h1 className="text-2xl font-semibold mb-4">Configurações</h1>
      <Link href="/dashboard" className="text-blue-600 underline">
        Voltar ao Dashboard
      </Link>
      <p className="mt-3">
        <Link href="/settings/ai" className="text-blue-600 underline text-sm">
          IA de atendimento automático →
        </Link>
        <br />
        <Link href="/settings/billing" className="text-blue-600 underline text-sm">
          Billing e uso →
        </Link>
      </p>

      <form onSubmit={handleSubmit} className="mt-6 max-w-md space-y-4">
        <div>
          <label htmlFor="aiDriver" className="block text-sm font-medium text-slate-700 mb-1">
            Motor de IA (respostas automáticas)
          </label>
          <select
            id="aiDriver"
            value={aiDriver}
            onChange={(e) => setAiDriver(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          >
            {AI_DRIVERS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">
            Para OpenAI: defina OPENAI_API_KEY no ambiente do webhook. Para Claude: ANTHROPIC_API_KEY.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded bg-red-50 text-red-700 text-sm">{error}</div>
        )}

        <Button type="submit" disabled={saving}>
          {saving ? "Salvando…" : "Salvar"}
        </Button>
      </form>
    </div>
  );
}
