"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { buttonClassName } from "@/components/ui/button";
import { StateEmpty, StateError, StateLoading } from "@/components/ui/app-states";

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
    return <StateLoading message="A carregar números ligados…" />;
  }

  return (
    <div className="space-y-6">
      {error ? <StateError message={error} onRetry={() => void load()} /> : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleConnect}
          disabled={connectLoading}
          className={buttonClassName("primary")}
        >
          {connectLoading ? "A abrir Meta…" : "Ligar novo número"}
        </button>
      </div>

      {numbers.length === 0 ? (
        <StateEmpty
          title="Ainda não há números ligados"
          description="Use o botão acima para abrir o fluxo da Meta e autorizar o WhatsApp Business. Depois, o número aparece aqui."
        />
      ) : (
        <ul className="space-y-3">
          {numbers.map((n) => (
            <li
              key={n.id}
              className="flex flex-col gap-3 rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{n.displayPhoneNumber || n.phoneNumberId}</p>
                <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                  ID {n.phoneNumberId} · Estado: {n.status}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(n.id)}
                disabled={removing === n.id}
                className={`${buttonClassName("secondary")} border-red-200 text-red-700 hover:bg-red-50`}
              >
                {removing === n.id ? "A remover…" : "Remover"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
