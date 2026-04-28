"use client";

import { useEffect, useState } from "react";
import { Button } from "@devflow/ui";
import { Card } from "@/components/ui/card";
import { fieldTextareaClassName } from "@/components/ui/form-field";
import { fetchProtected, protectedApiUserMessage } from "@/lib/protected-fetch";

/**
 * Edição manual das instruções ao nível do tenant (defaultPrompt / systemPrompt).
 * Complementa o assistente guiado do onboarding; não substitui /settings/ai (config do motor LLM).
 */
export function TenantInstructionsCard() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetchProtected("/api/tenants/me");
      const data = (await res.json().catch(() => ({}))) as {
        defaultPrompt?: string | null;
        systemPrompt?: string | null;
        error?: string;
      };
      if (!cancelled && res.ok) {
        const initial = (data.defaultPrompt || data.systemPrompt || "").trim();
        setText(initial);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const trimmed = text.trim();
      const res = await fetchProtected("/api/tenants/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultPrompt: trimmed || undefined,
          systemPrompt: trimmed || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(protectedApiUserMessage(res.status, data));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div id="instrucoes-conta">
    <Card padding="lg">
      <h2 className="text-base font-bold text-[var(--df-text-primary)]">Instruções do assistente (conta)</h2>
      <p className="mt-1 text-sm text-[var(--df-text-secondary)]">
        Texto que orienta o comportamento do atendimento no WhatsApp. Podes editar aqui em modo avançado ou voltar ao
        assistente guiado em <span className="font-medium text-[var(--df-text-primary)]">Configuração inicial</span> (onboarding)
        alterando estes campos manualmente abaixo.
      </p>
      {loading ? (
        <p className="mt-4 text-sm text-[var(--df-text-muted)]">A carregar…</p>
      ) : (
        <form onSubmit={handleSave} className="mt-4 space-y-4">
          <div>
            <label htmlFor="tenant-instructions" className="mb-1 block text-sm font-medium text-[var(--df-text-secondary)]">
              Prompt / instruções
            </label>
            <textarea
              id="tenant-instructions"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={12}
              className={fieldTextareaClassName}
              placeholder="Contexto do negócio, tom, regras e o que a IA deve ou não fazer…"
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button type="submit" disabled={saving}>
            {saving ? "A guardar…" : "Guardar instruções"}
          </Button>
        </form>
      )}
    </Card>
    </div>
  );
}
