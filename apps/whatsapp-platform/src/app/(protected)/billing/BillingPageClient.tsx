"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@devflow/ui";
import { PLANS, getPlan } from "@/modules/billing/plans";
import {
  COMMERCIAL_CHECKOUT_CTA,
  COMMERCIAL_PLAN_BENEFITS,
  COMMERCIAL_PLAN_HEADLINE,
  COMMERCIAL_PLAN_SUBTITLE,
  COMMERCIAL_RECOMMENDED_BADGE,
  COMMERCIAL_RECOMMENDED_PLAN,
} from "@/modules/billing/planPresentation";
import {
  formatIncludedUsageSentence,
  STRIPE_USAGE_LINE_LABELS,
  USAGE_AFTER_INCLUDED_EXPLAINER,
  USAGE_ANTI_SURPRISE_LINE,
} from "@/modules/billing/usageCommunication";
import { CurrentPlanUpgradeHint } from "@/components/dashboard/billing/CurrentPlanUpgradeHint";
import { HowUsageWorksSection } from "@/components/dashboard/billing/HowUsageWorksSection";
import { StateError, StateLoading } from "@/components/ui/app-states";
import { readBillingPostUrl, readSubscriptionFromApiJson } from "@/lib/api-json-client";
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
  enforceLimits: boolean;
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
      const j1 = await r1.json().catch(() => ({}));
      const j2 = (await r2.json().catch(() => ({}))) as { data?: Usage; error?: string };
      if (!r1.ok) {
        setErr(protectedApiUserMessage(r1.status, j1 as { error?: string }));
        return;
      }
      if (!r2.ok) {
        setErr(protectedApiUserMessage(r2.status, j2));
        return;
      }
      setSub(readSubscriptionFromApiJson(j1));
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

  const beyondIncluded =
    usage && (!usage.withinLimits.messages || !usage.withinLimits.ai);

  async function openPortal() {
    setPortalLoading(true);
    setErr(null);
    const endpoints = ["/api/stripe/portal", "/api/billing/portal"];
    for (const url of endpoints) {
      try {
        const res = await fetch(url, { method: "POST", credentials: "include" });
        const j = await res.json();
        if (!res.ok) {
          const ej = j as { error?: string | { message?: string } };
          const msg =
            typeof ej.error === "object" && ej.error && "message" in ej.error
              ? String((ej.error as { message?: string }).message)
              : typeof ej.error === "string"
                ? ej.error
                : "Falha";
          throw new Error(msg);
        }
        const postUrl = readBillingPostUrl(j);
        if (postUrl) {
          window.location.href = postUrl;
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
          const j = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(protectedApiUserMessage(res.status, j as { error?: string }));
          const postUrl = readBillingPostUrl(j);
          if (postUrl) {
            window.location.href = postUrl;
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
      {sub ? <CurrentPlanUpgradeHint plan={sub.plan} /> : null}
      {beyondIncluded && usage?.enforceLimits && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-4 text-sm text-amber-950">
          <p className="font-semibold">Limite incluído no plano atingido neste período</p>
          <p className="mt-1 text-amber-900/95">
            Com o modo de enforcement ativo, o serviço pode limitar funcionalidades até atualizar o plano ou o período
            renovar. Prefira subir de nível para recuperar margem no pacote incluído.
          </p>
          <Button type="button" size="sm" className="mt-3" onClick={() => setShowUpgradeModal(true)}>
            Ver planos e continuar
          </Button>
        </div>
      )}
      {beyondIncluded && usage && !usage.enforceLimits && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-800">
          <p className="font-semibold">Ultrapassou o incluído no plano — o atendimento continua</p>
          <p className="mt-1 text-slate-700">
            O uso adicional («{STRIPE_USAGE_LINE_LABELS.extraConversations}» e «{STRIPE_USAGE_LINE_LABELS.extraAi}») é
            registado e cobrado no fim do período. {USAGE_ANTI_SURPRISE_LINE}
          </p>
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
            {sub ? (
              <>
                <p className="mt-1 text-sm font-medium text-slate-500">{displayPlanName(sub.plan)}</p>
                <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                  {COMMERCIAL_PLAN_HEADLINE[getPlan(sub.plan).key]}
                </h2>
              </>
            ) : (
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">—</h2>
            )}
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
        <HowUsageWorksSection unitPrices={usage.unitPricesBrl} />
      )}

      {usage && (
        <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Consumo do período</h2>
              <p className="text-sm text-slate-500">{usage.period}</p>
            </div>
            <Link
              href="/settings/ai-analytics"
              className="text-sm font-semibold text-[var(--df-brand-700)] hover:underline"
            >
              Ver detalhe de IA →
            </Link>
          </div>
          <p className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
            Comparado com o que o seu plano inclui por mês. Depois do incluído, aplica-se o uso adicional — sem cortar o
            serviço. Na fatura Stripe, aparece como «{STRIPE_USAGE_LINE_LABELS.extraConversations}» e «
            {STRIPE_USAGE_LINE_LABELS.extraAi}».
          </p>
          <dl className="mt-2 grid gap-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="font-medium text-slate-700">Conversas (período)</dt>
              <dd className="text-right tabular-nums text-base font-semibold text-slate-900">
                {usage.messagesSent.toLocaleString("pt-BR")}
                {usage.limits.messagesPerMonth != null && (
                  <span className="text-sm font-normal text-slate-500">
                    {" "}
                    de {usage.limits.messagesPerMonth.toLocaleString("pt-BR")} incluídas
                  </span>
                )}
                {!usage.withinLimits.messages && (
                  <span className="ml-2 text-xs font-semibold text-amber-800">além do incluído</span>
                )}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="font-medium text-slate-700">Interações de IA (período)</dt>
              <dd className="text-right tabular-nums text-base font-semibold text-slate-900">
                {usage.aiResponses.toLocaleString("pt-BR")}
                {usage.limits.aiResponsesPerMonth != null && (
                  <span className="text-sm font-normal text-slate-500">
                    {" "}
                    de {usage.limits.aiResponsesPerMonth.toLocaleString("pt-BR")} incluídas
                  </span>
                )}
                {!usage.withinLimits.ai && (
                  <span className="ml-2 text-xs font-semibold text-amber-800">além do incluído</span>
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
                <p className="text-xs text-slate-500 mt-1">
                  {usage.limits.messagesPerMonth != null
                    ? `${usage.messagesSent.toLocaleString("pt-BR")} de ${usage.limits.messagesPerMonth.toLocaleString("pt-BR")} conversas incluídas`
                    : "Conversas no período"}
                </p>
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
              <div className="mt-3 rounded border border-emerald-100 bg-emerald-50/80 p-3">
                <p className="text-sm font-medium text-emerald-950">
                  {STRIPE_USAGE_LINE_LABELS.extraAi} (expansão de uso)
                </p>
                <p className="mt-1 text-sm text-emerald-900">
                  <strong>{usage.aiOverageBilled.toLocaleString("pt-BR")}</strong> interações além do incluído
                  {usage.aiOverageCostBrl != null && usage.aiOverageCostBrl > 0 && (
                    <> · estimativa R$ {usage.aiOverageCostBrl.toFixed(2)}</>
                  )}
                </p>
                <p className="mt-1 text-xs text-emerald-800/90">
                  O mesmo nome aparece na fatura Stripe para facilitar a reconciliação.
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
            className="max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl sm:max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-2">Escolha o plano certo para a sua operação</h3>
            <p className="text-sm text-slate-600 mb-4">
              Assinatura mensal fixa por nível. {USAGE_AFTER_INCLUDED_EXPLAINER} {USAGE_ANTI_SURPRISE_LINE}
            </p>
            <div className="flex flex-col gap-3">
              {BILLING_PLANS.map((key) => {
                const def = PLANS[key];
                const isCurrent = currentPlan === key;
                const price = def.priceBrl > 0 ? `R$ ${def.priceBrl}/mês` : "Gratuito";
                const isRecommended = key === COMMERCIAL_RECOMMENDED_PLAN;
                const benefits = COMMERCIAL_PLAN_BENEFITS[key];
                const cta = COMMERCIAL_CHECKOUT_CTA[key];
                return (
                  <div
                    key={key}
                    className={`rounded-xl border p-4 ${
                      isRecommended && !isCurrent
                        ? "border-amber-300 bg-gradient-to-br from-amber-50/90 to-white shadow-md ring-2 ring-amber-400/90"
                        : "border-slate-200 bg-white"
                    } ${isCurrent ? "opacity-90" : ""}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{def.name}</p>
                        <p className="mt-0.5 text-base font-semibold text-slate-900">{COMMERCIAL_PLAN_HEADLINE[key]}</p>
                        <p className="mt-1 text-xs leading-relaxed text-slate-600">{COMMERCIAL_PLAN_SUBTITLE[key]}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-slate-900">{price}</span>
                        {isRecommended && !isCurrent ? (
                          <span className="mt-1 block w-full rounded-full bg-amber-200/90 px-2 py-0.5 text-center text-[10px] font-bold uppercase text-amber-950">
                            {COMMERCIAL_RECOMMENDED_BADGE}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <p className="mt-2 rounded-lg bg-slate-50/90 px-2.5 py-2 text-xs font-medium leading-snug text-slate-800">
                      {formatIncludedUsageSentence(key)}
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{USAGE_AFTER_INCLUDED_EXPLAINER}</p>
                    <ul className="mt-3 space-y-1.5 border-t border-slate-100/90 pt-3 text-xs text-slate-700">
                      {benefits.map((line) => (
                        <li key={line} className="flex gap-2">
                          <span className="text-emerald-600" aria-hidden>
                            ✓
                          </span>
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      type="button"
                      className={`mt-4 w-full ${isRecommended && !isCurrent ? "font-semibold shadow-sm" : ""}`}
                      variant={isCurrent ? "ghost" : isRecommended ? "default" : "outline"}
                      onClick={() => (isCurrent ? null : void checkout(key))}
                      disabled={isCurrent || !!checkoutLoading}
                    >
                      {isCurrent
                        ? "Plano atual"
                        : checkoutLoading === key
                          ? "A redirecionar…"
                          : cta}
                    </Button>
                  </div>
                );
              })}
              <Button type="button" variant="ghost" onClick={() => setShowUpgradeModal(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
