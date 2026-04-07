"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@devflow/ui";

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
      const res = await fetch("/api/admin/queue/next", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) {
          setError("Faça login para pegar conversas da fila.");
          return;
        }
        setError(data.error ?? "Erro ao buscar próxima conversa.");
        return;
      }
      if (data.thread?.id) {
        router.push(`/admin/conversations/${data.thread.id}`);
        return;
      }
      setMessage(data.message ?? "Nenhuma conversa na fila no momento.");
    } catch {
      setError("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <header className="mb-6">
        <Link href="/admin/conversations" className="text-blue-600 underline text-sm">
          ← Voltar às conversas
        </Link>
        <h1 className="text-xl font-semibold text-slate-900 mt-2">Distribuição de fila</h1>
        <p className="text-sm text-slate-600 mt-1">
          Pegue a próxima conversa em espera para atender. Você será redirecionado para a conversa.
        </p>
      </header>

      <div className="max-w-md space-y-4">
        <Button onClick={handleNext} disabled={loading} className="w-full sm:w-auto">
          {loading ? "Buscando…" : "Pegar próxima conversa"}
        </Button>

        {message && (
          <div className="p-4 rounded-lg bg-slate-100 text-slate-700 text-sm">
            {message}
          </div>
        )}
        {error && (
          <div className="p-4 rounded-lg bg-red-50 text-red-700 text-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
