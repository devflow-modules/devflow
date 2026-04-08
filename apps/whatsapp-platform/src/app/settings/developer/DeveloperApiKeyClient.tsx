"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@devflow/ui";
import { Card } from "@/components/ui/card";
import { buttonClassName } from "@/components/ui/button";
import { StateLoading } from "@/components/ui/app-states";
import { fetchProtected, protectedApiUserMessage } from "@/lib/protected-fetch";

export function DeveloperApiKeyClient() {
  const [hasApiKey, setHasApiKey] = useState(false);
  const [masked, setMasked] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generated, setGenerated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const me = await fetchProtected("/api/tenants/me");
      const mj = (await me.json().catch(() => ({}))) as {
        apiKey?: string | null;
        hasApiKey?: boolean;
        error?: string;
      };
      if (cancelled) return;
      if (me.ok) {
        setHasApiKey(Boolean(mj.hasApiKey));
        setMasked(typeof mj.apiKey === "string" ? mj.apiKey : null);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleGenerate() {
    setError(null);
    setWorking(true);
    try {
      const res = await fetchProtected("/api/tenants/me/api-key", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { apiKey?: string; error?: string };
      if (!res.ok) throw new Error(protectedApiUserMessage(res.status, data));
      if (data.apiKey) {
        setGenerated(data.apiKey);
        setHasApiKey(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao gerar chave");
    } finally {
      setWorking(false);
    }
  }

  if (loading) {
    return <StateLoading message="A carregar…" />;
  }

  return (
    <div className="space-y-6">
      <Card padding="lg">
        <h2 className="text-base font-bold text-slate-900">Chave de API do espaço de trabalho</h2>
        <p className="mt-1 text-sm text-slate-600">
          Usa esta chave para integrações server-to-server e webhooks personalizados. Não partilhes em código público nem
          no frontend. Se gerares uma nova chave, a anterior deixa de funcionar.
        </p>

        {hasApiKey && !generated && masked && (
          <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-700">
            Chave atual (mascarada): {masked}
          </p>
        )}

        {generated && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-amber-900">Copia agora — não voltamos a mostrar a chave completa.</p>
            <div className="break-all rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-sm">{generated}</div>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6">
          <Button type="button" onClick={handleGenerate} disabled={working}>
            {working ? "A gerar…" : hasApiKey ? "Regenerar chave" : "Gerar chave"}
          </Button>
        </div>
      </Card>

      <p className="text-sm text-slate-500">
        <Link href="/settings" className="font-medium text-[var(--df-brand-700)] hover:underline">
          ← Voltar às configurações
        </Link>
      </p>
    </div>
  );
}
