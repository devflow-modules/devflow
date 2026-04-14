"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { StateEmpty, StateLoading } from "@/components/ui/app-states";
import { fetchProtected, protectedApiUserMessage } from "@/lib/protected-fetch";
import { WhatsappConnectCta } from "./WhatsappConnectCta";
import { WhatsappConnectErrorPanel } from "./WhatsappConnectErrorPanel";
import { WhatsappConnectSuccessBanner } from "./WhatsappConnectSuccessBanner";
import { WhatsappPhoneNumberCard } from "./WhatsappPhoneNumberCard";
import { WhatsappStatusSummary } from "./WhatsappStatusSummary";
import type { WhatsappPhoneNumberRow } from "./whatsappConnectTypes";
import { formatDisplayLine } from "./whatsappConnectUtils";
import {
  logOnboardingUxStage,
  mapOnboardingErrorToKind,
  type OnboardingErrorKind,
} from "./whatsappConnectUx";
import { PricingContextHint } from "@/components/dashboard/billing/PricingContextHint";
import { CONTEXTUAL_UPGRADE_HINTS } from "@/modules/billing/planPresentation";
import { getUiPlanCapabilities } from "@/modules/billing/planUiCapabilities";

type FriendlyError = {
  kind: OnboardingErrorKind;
  source: "connect" | "page";
};

export function WhatsappConnectClient() {
  const searchParams = useSearchParams();
  const [numbers, setNumbers] = useState<WhatsappPhoneNumberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [friendlyError, setFriendlyError] = useState<FriendlyError | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [patching, setPatching] = useState<string | null>(null);
  const [labelDrafts, setLabelDrafts] = useState<Record<string, string>>({});
  const [oauthSuccessBanner, setOauthSuccessBanner] = useState(false);
  const [listHighlight, setListHighlight] = useState(false);
  const [phoneCapacityHint, setPhoneCapacityHint] = useState<string | null>(null);
  const loggedStartRef = useRef(false);

  const setPageError = useCallback((message: string, status: number) => {
    const kind = mapOnboardingErrorToKind(message, status);
    logOnboardingUxStage("onboarding_error", { kind, source: "page" });
    setFriendlyError({ kind, source: "page" });
  }, []);

  const load = useCallback(async () => {
    setFriendlyError(null);
    try {
      const [res, billingRes] = await Promise.all([
        fetchProtected("/api/whatsapp/phone-numbers"),
        fetchProtected("/api/billing/ui"),
      ]);
      const json = (await res.json().catch(() => ({}))) as { data?: WhatsappPhoneNumberRow[]; error?: string };
      if (!res.ok) {
        const raw = json.error ?? protectedApiUserMessage(res.status, json);
        setPageError(raw, res.status);
        return;
      }
      const data = json.data ?? [];
      setNumbers(data);

      if (billingRes.ok) {
        const bj = (await billingRes.json().catch(() => ({}))) as {
          success?: boolean;
          data?: { plan?: string };
        };
        const plan = bj.data?.plan;
        if (plan) {
          const caps = getUiPlanCapabilities(plan);
          const maxPhones = caps.limits.phoneNumbers;
          if (maxPhones != null && data.filter((n) => n.status === "ACTIVE").length >= maxPhones) {
            setPhoneCapacityHint(
              caps.planKey === "SCALE"
                ? null
                : "Precisa de mais canais WhatsApp no mesmo espaço? O plano Scale inclui até 3 números — veja detalhes em Planos."
            );
          } else {
            setPhoneCapacityHint(null);
          }
        } else {
          setPhoneCapacityHint(null);
        }
      } else {
        setPhoneCapacityHint(null);
      }
      setLabelDrafts((prev) => {
        const next = { ...prev };
        for (const n of data) {
          if (next[n.id] === undefined) next[n.id] = n.label ?? "";
        }
        return next;
      });
    } catch {
      setPageError("Erro de rede ao carregar.", 0);
    } finally {
      setLoading(false);
    }
  }, [setPageError]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (loading || loggedStartRef.current) return;
    loggedStartRef.current = true;
    logOnboardingUxStage("onboarding_start", { path: "/dashboard/whatsapp" });
  }, [loading]);

  useEffect(() => {
    const success = searchParams.get("success");
    if (!success) return;
    setOauthSuccessBanner(true);
    setListHighlight(true);
    logOnboardingUxStage("onboarding_success");
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
    setFriendlyError(null);
    try {
      const res = await fetchProtected(`/api/whatsapp/phone-numbers/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        const raw = json.error ?? protectedApiUserMessage(res.status, json);
        setPageError(raw, res.status);
        return;
      }
      await load();
    } catch (e) {
      setPageError(e instanceof Error ? e.message : "Erro ao atualizar.", 0);
    } finally {
      setPatching(null);
    }
  }

  async function handleConnect() {
    setFriendlyError(null);
    setConnectLoading(true);
    let willRedirect = false;
    try {
      const res = await fetchProtected("/api/whatsapp/onboard", { method: "POST" });
      const json = (await res.json().catch(() => ({}))) as { data?: { oauthUrl?: string }; error?: string };
      if (!res.ok) {
        const raw = json.error ?? protectedApiUserMessage(res.status, json);
        const kind = mapOnboardingErrorToKind(raw, res.status);
        logOnboardingUxStage("onboarding_error", { kind, source: "connect", step: "onboard_post" });
        setFriendlyError({ kind, source: "connect" });
        return;
      }
      const oauthUrl = json.data?.oauthUrl;
      if (oauthUrl) {
        willRedirect = true;
        logOnboardingUxStage("onboarding_redirect");
        window.location.href = oauthUrl;
        return;
      }
      logOnboardingUxStage("onboarding_error", { kind: "generic", source: "connect", step: "missing_oauth_url" });
      setFriendlyError({ kind: "generic", source: "connect" });
    } catch (e) {
      const raw = e instanceof Error ? e.message : "Erro ao iniciar.";
      logOnboardingUxStage("onboarding_error", { kind: "generic", source: "connect", step: "exception" });
      setFriendlyError({ kind: mapOnboardingErrorToKind(raw, 0), source: "connect" });
    } finally {
      if (!willRedirect) setConnectLoading(false);
    }
  }

  async function handleRemove(id: string) {
    setRemoving(id);
    setFriendlyError(null);
    try {
      const res = await fetchProtected(`/api/whatsapp/phone-numbers?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        const raw = json.error ?? protectedApiUserMessage(res.status, json);
        setPageError(raw, res.status);
        return;
      }
      setNumbers((prev) => prev.filter((n) => n.id !== id));
    } catch (e) {
      setPageError(e instanceof Error ? e.message : "Erro ao remover.", 0);
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
    <div className="relative space-y-8">
      {connectLoading ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-[2px]"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="rounded-2xl border border-white/20 bg-white px-8 py-6 text-center shadow-xl">
            <div
              className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-[var(--df-brand-600)]"
              aria-hidden
            />
            <p className="mt-4 text-sm font-medium text-slate-800">Abrindo a Meta para conexão...</p>
          </div>
        </div>
      ) : null}

      {oauthSuccessBanner ? <WhatsappConnectSuccessBanner onDismiss={() => setOauthSuccessBanner(false)} /> : null}

      {friendlyError ? (
        <WhatsappConnectErrorPanel
          kind={friendlyError.kind}
          onDismiss={() => setFriendlyError(null)}
          onRetry={
            friendlyError.source === "page"
              ? () => void load()
              : () => void handleConnect()
          }
          retryLabel={friendlyError.source === "page" ? "Tentar novamente" : "Tentar conectar de novo"}
        />
      ) : null}

      <WhatsappStatusSummary
        channelConnected={stats.channelConnected}
        activeCount={stats.activeCount}
        primaryLine={stats.primaryLine}
        defaultOutboundLine={stats.defaultOutboundLine}
        totalNumbers={numbers.length}
      />

      {stats.channelConnected ? (
        <section
          className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-5 shadow-sm"
          aria-label="Teste rápido"
        >
          <h2 className="text-base font-semibold text-slate-900">Quer testar agora?</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Envie uma mensagem para seu número e veja ela aparecer na Inbox.
          </p>
          <Link
            href="/inbox"
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
          >
            Abrir Inbox
          </Link>
        </section>
      ) : null}

      <section className="rounded-2xl border border-[var(--df-brand-200)]/80 bg-[var(--df-brand-50)]/40 p-5 shadow-sm">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">Ligue seu WhatsApp ao sistema</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Você será redirecionado para a Meta (Facebook) para autorizar a conexão do seu número.
        </p>
        <ul className="mt-4 space-y-2.5 text-sm text-slate-700">
          <li className="flex gap-2">
            <span className="mt-0.5 text-[var(--df-brand-600)]" aria-hidden>
              ✓
            </span>
            <span>Você fará login com sua conta do Facebook</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 text-[var(--df-brand-600)]" aria-hidden>
              ✓
            </span>
            <span>A Meta pode pedir dados do seu negócio (isso é normal)</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 text-[var(--df-brand-600)]" aria-hidden>
              ✓
            </span>
            <span>Leva cerca de 2 a 5 minutos</span>
          </li>
        </ul>
        <div className="mt-5 rounded-xl border border-[var(--df-brand-100)] bg-white/70 px-4 py-3 text-sm leading-relaxed text-slate-700">
          Não precisa saber configurar nada — a Meta vai guiar você passo a passo.
        </div>
        <WhatsappConnectCta connectLoading={connectLoading} onConnect={handleConnect} />
      </section>

      <PricingContextHint message={CONTEXTUAL_UPGRADE_HINTS.whatsappChannel} />
      {phoneCapacityHint ? <PricingContextHint message={phoneCapacityHint} /> : null}

      {numbers.length === 0 ? (
        <StateEmpty
          title="Você ainda não conectou seu WhatsApp"
          description="Conecte seu número para começar a receber mensagens e atender clientes."
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
          <p className="mt-1 text-xs text-slate-500">Aproveite o canal ligado com estes atalhos.</p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-1 md:grid-cols-3">
            <li>
              <Link
                href="/inbox"
                className="flex flex-col rounded-xl border border-slate-200/90 bg-slate-50/50 px-4 py-3 transition hover:border-[var(--df-brand-300)] hover:bg-white"
              >
                <span className="text-sm font-medium text-slate-900">Responder mensagens</span>
                <span className="mt-0.5 text-xs text-slate-500">Abrir a caixa de conversas</span>
              </Link>
            </li>
            <li>
              <Link
                href="/settings/ai"
                className="flex flex-col rounded-xl border border-slate-200/90 bg-slate-50/50 px-4 py-3 transition hover:border-[var(--df-brand-300)] hover:bg-white"
              >
                <span className="text-sm font-medium text-slate-900">Configurar respostas automáticas</span>
                <span className="mt-0.5 text-xs text-slate-500">IA e mensagens inteligentes</span>
              </Link>
            </li>
            <li>
              <Link
                href="/automation"
                className="flex flex-col rounded-xl border border-slate-200/90 bg-slate-50/50 px-4 py-3 transition hover:border-[var(--df-brand-300)] hover:bg-white"
              >
                <span className="text-sm font-medium text-slate-900">Organizar atendimento</span>
                <span className="mt-0.5 text-xs text-slate-500">Regras e fluxos</span>
              </Link>
            </li>
          </ul>
        </section>
      ) : null}
    </div>
  );
}
