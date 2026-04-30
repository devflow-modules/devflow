"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { fetchProtected, protectedApiUserMessage } from "@/lib/protected-fetch";

export function DistribuirClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleNext() {
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const res = await fetchProtected("/api/inbox/queue/next");
      const raw = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(protectedApiUserMessage(res.status, raw as { error?: string }));
        return;
      }
      const envelope = raw as {
        success?: boolean;
        data?: { thread?: { id: string } | null; message?: string };
      };
      if (envelope.success !== true || envelope.data === undefined) {
        setMessage("Resposta da fila inesperada. Tente de novo.");
        return;
      }
      const tid = envelope.data.thread?.id ?? null;
      if (tid) {
        router.push(`/inbox?thread=${encodeURIComponent(tid)}`);
        return;
      }
      setMessage(envelope.data.message ?? "Nenhuma conversa na fila no momento.");
    } catch {
      setError("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <Link href="/inbox" className="text-sm font-medium text-blue-600 underline-offset-4 hover:underline">
          ← Voltar à inbox
        </Link>
        <h1 className="mt-2 text-xl font-semibold df-text-primary">Distribuição de fila</h1>
        <p className="mt-1 text-sm df-text-secondary">
          Pegue a próxima conversa em espera para atender. Você será direcionado à inbox dessa conversa.
        </p>
      </header>

      <div className="max-w-md space-y-4">
        <Button variant="secondary" onClick={() => void handleNext()} disabled={loading} className="w-full sm:w-auto">
          {loading ? "Buscando…" : "Pegar próxima conversa"}
        </Button>

        {message && (
          <div className="rounded-lg bg-muted p-4 text-sm df-text-secondary">
            {message}
          </div>
        )}
        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
