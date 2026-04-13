"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { StateEmpty, StateError, StateLoading } from "@/components/ui/app-states";
import { fetchProtected, protectedApiUserMessage } from "@/lib/protected-fetch";
import { WhatsappConnectCta } from "./WhatsappConnectCta";
import { WhatsappConnectSuccessBanner } from "./WhatsappConnectSuccessBanner";
import { WhatsappPhoneNumberCard } from "./WhatsappPhoneNumberCard";
import { WhatsappStatusSummary } from "./WhatsappStatusSummary";
import type { WhatsappPhoneNumberRow } from "./whatsappConnectTypes";
import { formatDisplayLine } from "./whatsappConnectUtils";

export function WhatsappConnectClient() {
  const searchParams = useSearchParams();
  const [numbers, setNumbers] = useState<WhatsappPhoneNumberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [patching, setPatching] = useState<string | null>(null);
  const [labelDrafts, setLabelDrafts] = useState<Record<string, string>>({});
  const [oauthSuccessBanner, setOauthSuccessBanner] = useState(false);
  const [listHighlight, setListHighlight] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetchProtected("/api/whatsapp/phone-numbers");
      const json = (await res.json().catch(() => ({}))) as { data?: WhatsappPhoneNumberRow[]; error?: string };
      if (!res.ok) {
        setError(protectedApiUserMessage(res.status, json));
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
      setError("Não foi possível carregar o estado da ligação. Verifique a rede e tente novamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const success = searchParams.get("success");
    if (!success) return;
    setOauthSuccessBanner(true);
    setListHighlight(true);
    void load();
    window.history.replaceState({}, "", "/dashboard/whatsapp");
    const t = window.setTimeout(() => setListHighlight(false), 4500);
    return () => window.clearTimeout(t);
  }, [searchParams, load]);

  const stats = useMemo(() => {
    const active = numbers.filter((n) => n.status === "ACTIVE");
    const primary = numbers.find((n) => n.isPrimary);
    const defaultOutbound = numbers.find((n) => n.isDefaultOutbound);
    return {
      channelConnected: numbers.length > 0,
      activeCount: active.length,
      primaryLine: primary ? formatDisplayLine(primary) : null,
      defaultOutboundLine: defaultOutbound ? formatDisplayLine(defaultOutbound) : null,
    };
  }, [numbers]);

  async function patchNumber(id: string, body: Record<string, unknown>) {
    setPatching(id);
    setError(null);
    try {
      const res = await fetchProtected(`/api/whatsapp/phone-numbers/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(protectedApiUserMessage(res.status, json));
        return;
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível atualizar. Tente novamente.");
    } finally {
      setPatching(null);
    }
  }

  async function handleConnect() {
    setConnectLoading(true);
    setError(null);
    try {
      const res = await fetchProtected("/api/whatsapp/onboard", { method: "POST" });
      const json = (await res.json().catch(() => ({}))) as { data?: { oauthUrl?: string }; error?: string };
      if (!res.ok) {
        setError(protectedApiUserMessage(res.status, json));
        return;
      }
      const oauthUrl = json.data?.oauthUrl;
      if (oauthUrl) {
        window.location.href = oauthUrl;
        return;
      }
      setError("Não foi possível iniciar a ligação. Tente novamente.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível iniciar a ligação.");
    } finally {
      setConnectLoading(false);
    }
  }

  async function handleRemove(id: string) {
    setRemoving(id);
    setError(null);
    try {
      const res = await fetchProtected(`/api/whatsapp/phone-numbers?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(protectedApiUserMessage(res.status, json));
        return;
      }
      setNumbers((prev) => prev.filter((n) => n.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível remover o número.");
    } finally {
      setRemoving(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-6 shadow-sm">
          <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
          </div>
        </div>
        <StateLoading message="A carregar o estado do canal WhatsApp…" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {oauthSuccessBanner ? <WhatsappConnectSuccessBanner onDismiss={() => setOauthSuccessBanner(false)} /> : null}

      {error ? (
        <StateError
          title="Não foi possível atualizar"
          message={error}
          onRetry={() => void load()}
          retryLabel="Tentar novamente"
        />
      ) : null}

      <WhatsappStatusSummary
        channelConnected={stats.channelConnected}
        activeCount={stats.activeCount}
        primaryLine={stats.primaryLine}
        defaultOutboundLine={stats.defaultOutboundLine}
        totalNumbers={numbers.length}
      />

      <WhatsappConnectCta connectLoading={connectLoading} onConnect={handleConnect} />

      {numbers.length === 0 ? (
        <StateEmpty
          title="Ainda não há números ligados ao canal"
          description="Ligue um número WhatsApp Business para a Inbox e o envio passarem a usar a linha correta. O processo é feito com a Meta — seguro e reconhecido pelas equipas."
          nextStep="Use «Ligar novo número» acima: abrimos a Meta, autoriza, e volta aqui sozinho quando terminar."
        />
      ) : (
        <section aria-label="Números ligados">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Números ligados</h2>
              <p className="mt-0.5 text-xs text-slate-500">Gestão da linha, etiquetas internas e envio</p>
            </div>
          </div>
          <ul
            className={`space-y-4 transition-[box-shadow] duration-500 ${listHighlight ? "rounded-2xl ring-2 ring-[var(--df-brand-400)]/50 ring-offset-2 ring-offset-slate-50" : ""}`}
          >
            {numbers.map((n) => (
              <WhatsappPhoneNumberCard
                key={n.id}
                number={n}
                labelDraft={labelDrafts[n.id] ?? ""}
                onLabelChange={(value) => setLabelDrafts((prev) => ({ ...prev, [n.id]: value }))}
                onSaveLabel={() =>
                  patchNumber(n.id, {
                    label: (labelDrafts[n.id] ?? "").trim() || null,
                  })
                }
                patching={patching === n.id}
                removing={removing === n.id}
                onSetPrimary={() => patchNumber(n.id, { setPrimary: true })}
                onSetDefaultOutbound={() => patchNumber(n.id, { setDefaultOutbound: true })}
                onRemove={() => handleRemove(n.id)}
              />
            ))}
          </ul>
        </section>
      )}

      {stats.channelConnected ? (
        <section
          className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm"
          aria-label="Próximos passos"
        >
          <h2 className="text-sm font-semibold text-slate-900">Próximos passos</h2>
          <p className="mt-1 text-xs text-slate-500">
            Com o canal ligado, estes atalhos ajudam a colocar a equipa e as automações a trabalhar de imediato.
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            <li>
              <Link
                href="/inbox"
                className="flex flex-col rounded-xl border border-slate-200/90 bg-slate-50/50 px-4 py-3 transition hover:border-[var(--df-brand-300)] hover:bg-white"
              >
                <span className="text-sm font-medium text-slate-900">Abrir a Inbox</span>
                <span className="mt-0.5 text-xs text-slate-500">Ver conversas e responder na linha ligada</span>
              </Link>
            </li>
            <li>
              <Link
                href="/settings/ai"
                className="flex flex-col rounded-xl border border-slate-200/90 bg-slate-50/50 px-4 py-3 transition hover:border-[var(--df-brand-300)] hover:bg-white"
              >
                <span className="text-sm font-medium text-slate-900">Configurar a IA de atendimento</span>
                <span className="mt-0.5 text-xs text-slate-500">Tom, guardas e automação no WhatsApp</span>
              </Link>
            </li>
            <li>
              <Link
                href="/automation"
                className="flex flex-col rounded-xl border border-slate-200/90 bg-slate-50/50 px-4 py-3 transition hover:border-[var(--df-brand-300)] hover:bg-white"
              >
                <span className="text-sm font-medium text-slate-900">Rever automações</span>
                <span className="mt-0.5 text-xs text-slate-500">Regras e fluxos do canal</span>
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard"
                className="flex flex-col rounded-xl border border-slate-200/90 bg-slate-50/50 px-4 py-3 transition hover:border-[var(--df-brand-300)] hover:bg-white"
              >
                <span className="text-sm font-medium text-slate-900">Testar a operação</span>
                <span className="mt-0.5 text-xs text-slate-500">Resumo do painel e métricas do dia</span>
              </Link>
            </li>
          </ul>
        </section>
      ) : null}
    </div>
  );
}
