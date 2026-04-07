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
  isPrimary: boolean;
  isDefaultOutbound: boolean;
  label: string | null;
  createdAt: string;
}

export function WhatsappConnectClient() {
  const searchParams = useSearchParams();
  const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [patching, setPatching] = useState<string | null>(null);
  const [labelDrafts, setLabelDrafts] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/whatsapp/phone-numbers", { credentials: "include" });
      const json = (await res.json().catch(() => ({}))) as { data?: PhoneNumber[]; error?: string };
      if (!res.ok) {
        setError(
          json.error ??
            (res.status === 401
              ? "Sessão expirada ou inválida. Inicie sessão novamente."
              : "Não foi possível carregar os números.")
        );
        return;
      }
      const data = json.data ?? [];
      setNumbers(data);
      setLabelDrafts((prev) => {
        const next = { ...prev };
        for (const n of data) {
          if (next[n.id] === undefined) next[n.id] = n.label ?? "";
        }
        return next;
      });
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

  async function patchNumber(id: string, body: Record<string, unknown>) {
    setPatching(id);
    setError(null);
    try {
      const res = await fetch(`/api/whatsapp/phone-numbers/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Erro ao atualizar número");
        return;
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao atualizar");
    } finally {
      setPatching(null);
    }
  }

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
              className="flex flex-col gap-3 rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0 flex-1 space-y-2">
                <p className="font-semibold text-slate-900">{n.displayPhoneNumber || n.phoneNumberId}</p>
                <p className="text-xs text-slate-500 sm:text-sm">
                  ID {n.phoneNumberId} · Estado: {n.status}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {n.isPrimary ? (
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-900">
                      Principal
                    </span>
                  ) : null}
                  {n.isDefaultOutbound ? (
                    <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-semibold text-teal-900">
                      Envio predefinido
                    </span>
                  ) : null}
                </div>
                <div className="flex max-w-md flex-col gap-1 sm:flex-row sm:items-end">
                  <label className="block flex-1 text-xs font-medium text-slate-600">
                    Etiqueta (interna)
                    <input
                      type="text"
                      className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                      value={labelDrafts[n.id] ?? ""}
                      onChange={(e) =>
                        setLabelDrafts((prev) => ({ ...prev, [n.id]: e.target.value }))
                      }
                      placeholder="Ex.: Suporte, Vendas"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={patching === n.id}
                    className={buttonClassName("secondary")}
                    onClick={() =>
                      patchNumber(n.id, {
                        label: (labelDrafts[n.id] ?? "").trim() || null,
                      })
                    }
                  >
                    {patching === n.id ? "A guardar…" : "Guardar etiqueta"}
                  </button>
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                {n.status === "ACTIVE" && !n.isPrimary ? (
                  <button
                    type="button"
                    disabled={patching === n.id}
                    className={`${buttonClassName("secondary")} text-xs`}
                    onClick={() => patchNumber(n.id, { setPrimary: true })}
                  >
                    Definir como principal
                  </button>
                ) : null}
                {n.status === "ACTIVE" && !n.isDefaultOutbound ? (
                  <button
                    type="button"
                    disabled={patching === n.id}
                    className={`${buttonClassName("secondary")} text-xs`}
                    onClick={() => patchNumber(n.id, { setDefaultOutbound: true })}
                  >
                    Envio predefinido
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => handleRemove(n.id)}
                  disabled={removing === n.id}
                  className={`${buttonClassName("secondary")} border-red-200 text-red-700 hover:bg-red-50`}
                >
                  {removing === n.id ? "A remover…" : "Remover"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
