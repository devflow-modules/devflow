"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface PhoneNumber {
  id: string;
  phoneNumberId: string;
  displayPhoneNumber: string | null;
  wabaId: string | null;
  status: string;
  createdAt: string;
}

export function WhatsappConnectClient() {
  const searchParams = useSearchParams();
  const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/whatsapp/phone-numbers", { credentials: "include" });
      if (!res.ok) {
        setError("Não foi possível carregar os números.");
        return;
      }
      const json = await res.json();
      setNumbers(json.data ?? []);
    } catch {
      setError("Erro de rede");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const success = searchParams.get("success");
    if (success) {
      void load();
      window.history.replaceState({}, "", "/dashboard/whatsapp");
    }
  }, [searchParams, load]);

  async function handleConnect() {
    setConnectLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/whatsapp/onboard", {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Erro ao obter URL de conexão");
        return;
      }
      const oauthUrl = json.data?.oauthUrl;
      if (oauthUrl) {
        window.location.href = oauthUrl;
        return;
      }
      setError("URL de conexão não retornada");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao conectar");
    } finally {
      setConnectLoading(false);
    }
  }

  async function handleRemove(id: string) {
    setRemoving(id);
    setError(null);
    try {
      const res = await fetch(`/api/whatsapp/phone-numbers?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Erro ao remover");
        return;
      }
      setNumbers((prev) => prev.filter((n) => n.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao remover");
    } finally {
      setRemoving(null);
    }
  }

  if (loading) {
    return <p className="text-slate-600">Carregando…</p>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800 text-sm">
          {error}
        </div>
      )}

      <div>
        <button
          type="button"
          onClick={handleConnect}
          disabled={connectLoading}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-white font-medium hover:bg-emerald-700 disabled:opacity-50"
        >
          {connectLoading ? "Abrindo…" : "Conectar novo número"}
        </button>
      </div>

      {numbers.length === 0 ? (
        <div className="rounded-lg border border-slate-200 p-6 text-center text-slate-600">
          <p>Nenhum número conectado.</p>
          <p className="text-sm mt-2">Clique em &quot;Conectar novo número&quot; para começar.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {numbers.map((n) => (
            <li
              key={n.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 p-4"
            >
              <div>
                <p className="font-medium">{n.displayPhoneNumber || n.phoneNumberId}</p>
                <p className="text-sm text-slate-500">
                  ID: {n.phoneNumberId} • Status: {n.status}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(n.id)}
                disabled={removing === n.id}
                className="rounded border border-red-200 px-3 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {removing === n.id ? "Removendo…" : "Remover"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
