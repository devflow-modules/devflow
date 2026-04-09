"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@devflow/ui";
import { Card } from "@/components/ui/card";
import { buttonClassName } from "@/components/ui/button";
import { StateEmpty, StateError, StateLoading } from "@/components/ui/app-states";
import { fieldSelectClassName } from "@/components/ui/form-field";
import { fetchProtected, protectedApiUserMessage } from "@/lib/protected-fetch";
import { isTenantManager } from "@/lib/roles";
import type { UserRole } from "@/modules/auth";

const AI_DRIVERS = [
  { value: "ruleBased", label: "Apenas regras (sem LLM)" },
  { value: "openAI", label: "OpenAI (GPT)" },
  { value: "claude", label: "Claude (Anthropic)" },
] as const;

type TenantMe = {
  id: string;
  name: string | null;
  aiDriver: string | null;
  hasWhatsappPhone?: boolean;
  hasApiKey: boolean;
};

const KNOWN_ROLES = new Set<UserRole>(["operator", "manager", "platform_admin"]);

export function SettingsTenantForm() {
  const [tenant, setTenant] = useState<TenantMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [aiDriver, setAiDriver] = useState<string>("ruleBased");
  const [sessionRole, setSessionRole] = useState<UserRole | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadError(null);
      try {
        const [res, verifyRes] = await Promise.all([
          fetchProtected("/api/tenants/me"),
          fetchProtected("/api/auth/verify"),
        ]);
        const vj = verifyRes.ok ? ((await verifyRes.json()) as { user?: { role?: string } }) : {};
        if (!cancelled) {
          const r = vj.user?.role;
          if (r && KNOWN_ROLES.has(r as UserRole)) setSessionRole(r as UserRole);
        }
        const data = (await res.json().catch(() => ({}))) as TenantMe & { error?: string };
        if (!res.ok) {
          if (res.status === 401) setTenant(null);
          else if (!cancelled) setLoadError(protectedApiUserMessage(res.status, data));
          return;
        }
        if (!cancelled) {
          setTenant({
            id: data.id,
            name: data.name,
            aiDriver: data.aiDriver,
            hasWhatsappPhone: data.hasWhatsappPhone,
            hasApiKey: data.hasApiKey,
          });
          setAiDriver(data.aiDriver ?? "ruleBased");
        }
      } catch {
        if (!cancelled) setLoadError("Erro de rede. Verifique a ligação e tente outra vez.");
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
    setFormError(null);
    setSaving(true);
    try {
      const res = await fetchProtected("/api/tenants/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiDriver: aiDriver || null }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; aiDriver?: string | null };
      if (!res.ok) {
        throw new Error(protectedApiUserMessage(res.status, data));
      }
      setTenant((prev) =>
        prev ? { ...prev, aiDriver: data.aiDriver !== undefined ? data.aiDriver : prev.aiDriver } : null
      );
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <StateLoading message="A carregar definições…" />;
  }

  if (loadError) {
    return <StateError message={loadError} onRetry={() => window.location.reload()} />;
  }

  if (!tenant) {
    return (
      <StateEmpty
        title="Sessão necessária"
        description="Inicie sessão para ver e alterar as definições desta conta."
        action={
          <Link href="/login" className={buttonClassName("primary")}>
            Ir para o login
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {formError ? (
        <div className="rounded-xl border border-red-200/90 bg-red-50 px-4 py-3 text-sm text-red-800">{formError}</div>
      ) : null}

      <div className="flex flex-wrap gap-4 text-sm">
        <Link href="/settings/ai" className="font-semibold text-[var(--df-brand-700)] hover:underline">
          IA de atendimento automático →
        </Link>
        {sessionRole && isTenantManager(sessionRole) ? (
          <Link href="/settings/developer" className="font-semibold text-[var(--df-brand-700)] hover:underline">
            API e integrações →
          </Link>
        ) : null}
        <Link href="/billing" className="font-semibold text-[var(--df-brand-700)] hover:underline">
          Plano e uso →
        </Link>
      </div>

      <Card padding="lg">
        <h2 className="text-base font-bold text-slate-900">Motor de respostas automáticas</h2>
        <p className="mt-1 text-sm text-slate-600">
          Define qual serviço gera texto quando a automação ou a IA respondem. Chaves de API ficam no ambiente do servidor.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 max-w-md space-y-4">
          <div>
            <label htmlFor="aiDriver" className="mb-1 block text-sm font-medium text-slate-700">
              Fornecedor
            </label>
            <select
              id="aiDriver"
              value={aiDriver}
              onChange={(e) => setAiDriver(e.target.value)}
              className={fieldSelectClassName}
            >
              {AI_DRIVERS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-slate-500">
              OpenAI: OPENAI_API_KEY no ambiente. Claude: ANTHROPIC_API_KEY.
            </p>
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? "A guardar…" : "Guardar alterações"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
