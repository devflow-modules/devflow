"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@devflow/ui";
import { PLANS } from "@/modules/billing/plans";
import { StateError, StateLoading } from "@/components/ui/app-states";
import { fetchProtected, protectedApiUserMessage } from "@/lib/protected-fetch";

type Sub = {
  plan: string;
  status: string;
  stripeCustomerId: string | null;
  currentPeriodEnd: string | null;
  activeUntil: string | null;
  cancelAtPeriodEnd: boolean;
  meteredBillingConfigured: boolean;
  lastInvoiceId: string | null;
  lastInvoiceStatus: string | null;
  lastInvoiceAmountPaid: number | null;
};

type Usage = {
  period: string;
  messagesSent: number;
  aiResponses: number;
  limits: { messagesPerMonth: number | null; aiResponsesPerMonth: number | null };
  unitPricesBrl: { message: number; aiResponse: number };
  estimatedVariableCostBrl: number;
  withinLimits: { messages: boolean; ai: boolean };
  aiOverageBilled?: number;
  aiOverageCostBrl?: number;
  stripeMetered?: {
    messagesReportedToStripe: number;
    aiReportedToStripe: number;
    pendingStripeReports: number;
  };
};

type BillingPlanKey = "STARTER" | "PRO" | "SCALE";

const BILLING_PLANS: BillingPlanKey[] = ["STARTER", "PRO", "SCALE"];

function displayPlanName(plan: string | undefined): string {
  const key = plan?.toUpperCase() as keyof typeof PLANS;
  return PLANS[key]?.name ?? plan ?? "—";
}

function subscriptionStatusPt(status: string | undefined): string {
  const s = (status ?? "").toUpperCase();
  if (s === "ACTIVE") return "Ativo — cobrança em dia";
  if (s === "TRIAL") return "Período de teste";
  if (s === "PAST_DUE") return "Pagamento em falta — atualize o método";
  if (s === "CANCELED" || s === "CANCELLED") return "Cancelado";
  return status ?? "—";
}

function nextRenewalLabel(iso: string | null | undefined): string {
  if (!iso) return "Quando ativar um plano pago, mostramos aqui a data da próxima renovação.";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export function BillingPageClient() {
  const searchParams = useSearchParams();
  const successParam = searchParams.get("success");
  const canceledParam = searchParams.get("canceled");
  const [sub, setSub] = useState<Sub | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<BillingPlanKey | null>(null);
  const [, setUpgradeLoading] = useState<BillingPlanKey | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const [r1, r2] = await Promise.all([
        fetchProtected("/api/billing/subscription"),
        fetchProtected("/api/billing/usage"),
      ]);
      const j1 = (await r1.json().catch(() => ({}))) as { data?: Sub; error?: string };
      const j2 = (await r2.json().catch(() => ({}))) as { data?: Usage; error?: string };
      if (!r1.ok) {
        setErr(protectedApiUserMessage(r1.status, j1));
        return;
      }
      if (!r2.ok) {
        setErr(protectedApiUserMessage(r2.status, j2));
        return;
      }
      setSub(j1.data ?? null);
      setUsage(j2.data ?? null);
    } catch {
      setErr("Erro de rede");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const atLimit =
    usage &&
    (!usage.withinLimits.messages || !usage.withinLimits.ai);

  async function openPortal() {
    setPortalLoading(true);
    setErr(null);
    const endpoints = ["/api/stripe/portal", "/api/billing/portal"];
    for (const url of endpoints) {
      try {
        const res = await fetch(url, { method: "POST", credentials: "include" });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error ?? "Falha");
        if (j.data?.url) {
          window.location.href = j.data.url;
          return;
        }
      } catch (e) {
        if (url === endpoints[1]) {
          setErr(e instanceof Error ? e.message : "Portal indisponível");
        }
      }
    }
    setPortalLoading(false);
  }

  async function checkout(plan: BillingPlanKey) {
    setCheckoutLoading(plan);
    setErr(null);
    try {
      const endpoints = ["/api/stripe/checkout", "/api/billing/checkout"];
      for (const url of endpoints) {
        try {
          const res = await fetchProtected(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ plan }),
          });
          const j = (await res.json().catch(() => ({}))) as { error?: string; data?: { url: string } };
          if (!res.ok) throw new Error(protectedApiUserMessage(res.status, j));
          if (j.data?.url) {
            window.location.href = j.data.url;
            return;
          }
        } catch {
          continue;
        }
      }
      await upgradeStub(plan);
    } finally {
      setCheckoutLoading(null);
    }
  }

  async function upgradeStub(plan: BillingPlanKey) {
    setUpgradeLoading(plan);
    setErr(null);
    try {
      const res = await fetchProtected("/api/billing/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(protectedApiUserMessage(res.status, j));
      await load();
      setShowUpgradeModal(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao fazer upgrade");
    } finally {
      setUpgradeLoading(null);
    }
  }

  const currentPlan = sub?.plan?.toUpperCase() ?? "FREE";

  if (loading) {
    return <StateLoading message="A carregar informação de plano…" className="min-h-[40vh]" />;
  }

  return (
    <div className="min-w-0 space-y-8">
      {successParam === "true" && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <p className="font-medium">Plano atualizado com sucesso.</p>
        </div>
      )}
      {canceledParam === "true" && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <p>Checkout cancelado.</p>
        </div>
      )}
      {atLimit && (
        <div className="rounded-lg border-2 border-red-400 bg-red-50 px-4 py-4 text-sm text-red-900">
          <p className="font-semibold">🚫 Sua IA parou de responder automaticamente</p>
          <p className="mt-1 text-red-800">
            As mensagens estão sendo respondidas de forma limitada. Para voltar ao atendimento automático:
          </p>
          <Button
            type="button"
            size="sm"
            className="mt-3"
            onClick={() => setShowUpgradeModal(true)}
          >
            Continuar usando IA
          </Button>
        </div>
      )}

      {err ? (
        <StateError
          title="Não foi possível atualizar os dados"
          message={err}
          onRetry={() => {
            setLoading(true);
            void load();
          }}
        />
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white to-slate-50/80 p-5 shadow-md sm:p-8">
        <div className="flex min-w-0 flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">O seu plano</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              {sub ? displayPlanName(sub.plan) : "—"}
            </h2>
            <p className="mt-2 text-sm font-medium text-slate-600">
              {sub ? subscriptionStatusPt(sub.status) : "Carregue novamente se não vir dados."}
            </p>
            <p className="mt-4 text-sm text-slate-600">
              <span className="font-semibold text-slate-800">Próxima renovação ou fim do período:</span>{" "}
              <span className="block sm:inline">{nextRenewalLabel(sub?.currentPeriodEnd ?? sub?.activeUntil)}</span>
            </p>
          </div>
          <div className="flex min-w-0 shrink-0 flex-col gap-2 sm:flex-row lg:flex-col lg:items-stretch">
            <Button type="button" className="font-semibold" onClick={() => setShowUpgradeModal(true)}>
              Mudar de plano
            </Button>
            {sub?.stripeCustomerId ? (
              <Button type="button" variant="outline" onClick={() => void openPortal()} disabled={portalLoading}>
                {portalLoading ? "A abrir…" : "Faturas e método de pagamento"}
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      {usage && (
        <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Uso neste período</h2>
              <p className="text-sm text-slate-500">{usage.period}</p>
            </div>
            <Link
              href="/settings/ai-analytics"
              className="text-sm font-semibold text-[var(--df-brand-700)] hover:underline"
            >
              Ver detalhe de IA →
            </Link>
          </div>
          <p className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Fora do incluído no plano, pode haver custo extra por mensagem ou por resposta automática (valores no contrato).
          </p>
          <dl className="mt-2 grid gap-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="font-medium text-slate-700">Mensagens enviadas</dt>
              <dd className="text-right tabular-nums text-base font-semibold text-slate-900">
                {usage.messagesSent}
                {usage.limits.messagesPerMonth != null && (
                  <span className="text-sm font-normal text-slate-500">
                    {" "}
                    de {usage.limits.messagesPerMonth} incluídas
                  </span>
                )}
                {!usage.withinLimits.messages && (
                  <span className="ml-2 text-xs font-semibold text-amber-700">limite atingido</span>
                )}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="font-medium text-slate-700">Respostas automáticas (IA)</dt>
              <dd className="text-right tabular-nums text-base font-semibold text-slate-900">
                {usage.aiResponses}
                {usage.limits.aiResponsesPerMonth != null && (
                  <span className="text-sm font-normal text-slate-500">
                    {" "}
                    de {usage.limits.aiResponsesPerMonth.toLocaleString("pt-BR")} incluídas
                  </span>
                )}
                {!usage.withinLimits.ai && (
                  <span className="ml-2 text-xs font-semibold text-amber-700">limite atingido</span>
                )}
              </dd>
            </div>
            <div className="mt-2 space-y-2">
              <div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{
                      width: usage.limits.messagesPerMonth
                        ? `${Math.min(
                            100,
                            (usage.messagesSent / usage.limits.messagesPerMonth) * 100
                          )}%`
                        : "0%",
                    }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">Conversas</p>
              </div>
              {usage.limits.aiResponsesPerMonth != null && (
                <div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        !usage.withinLimits.ai
                          ? "bg-red-500"
                          : usage.aiResponses / usage.limits.aiResponsesPerMonth >= 0.7
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          (usage.aiResponses / usage.limits.aiResponsesPerMonth) * 100
                        )}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Respostas IA — {usage.aiResponses} / {usage.limits.aiResponsesPerMonth.toLocaleString("pt-BR")}
                  </p>
                </div>
              )}
            </div>
            {usage.aiOverageBilled != null && usage.aiOverageBilled > 0 && (
              <div className="mt-3 rounded border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm font-medium text-amber-900">
                  Você excedeu o plano, mas a IA continuou ativa
                </p>
                <p className="mt-1 text-sm text-amber-800">
                  <strong>{usage.aiOverageBilled}</strong> respostas excedentes faturadas
                  {usage.aiOverageCostBrl != null && usage.aiOverageCostBrl > 0 && (
                    <> · R$ {usage.aiOverageCostBrl.toFixed(2)}</>
                  )}
                </p>
                <p className="mt-1 text-xs text-amber-700">
                  Este valor será refletido na cobrança.
                </p>
              </div>
            )}
          </dl>
        </section>
      )}

      {showUpgradeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowUpgradeModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-xl max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-2">Escolha seu plano</h3>
            <p className="text-sm text-slate-600 mb-2">
              Mais respostas IA por mês. Assinatura fixa + excedente (R$0,03/conversa, R$0,09/IA).
            </p>
            <p className="text-xs text-slate-500 mb-4">
              Upgrade desbloqueia limite imediatamente.
            </p>
            <div className="flex flex-col gap-2">
              {BILLING_PLANS.map((key) => {
                const def = PLANS[key];
                const isCurrent = currentPlan === key;
                const price = def.priceBrl > 0 ? `R$ ${def.priceBrl}/mês` : "Gratuito";
                const ai = def.limits.aiCallsPerMonth;
                const aiLabel = ai != null ? `até ${ai.toLocaleString("pt-BR")} respostas IA` : "alto volume";
                const planTag =
                  key === "STARTER"
                    ? "ideal para pequenos negócios"
                    : key === "PRO"
                      ? "⭐ recomendado"
                      : "alto volume / escala";
                const isPro = key === "PRO";
                return (
                  <Button
                    key={key}
                    type="button"
                    variant={isCurrent ? "ghost" : isPro ? "default" : "outline"}
                    onClick={() => (isCurrent ? null : void checkout(key))}
                    disabled={isCurrent || !!checkoutLoading}
                    className={`text-left justify-start h-auto py-3 ${isPro && !isCurrent ? "ring-2 ring-amber-400" : ""}`}
                  >
                    <span className="block">
                      <strong>{def.name}</strong> — {price}
                    </span>
                    <span className="block text-xs font-normal opacity-90 mt-0.5">
                      {aiLabel} · {planTag}
                    </span>
                    {checkoutLoading === key && " …"}
                  </Button>
                );
              })}
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowUpgradeModal(false)}
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
