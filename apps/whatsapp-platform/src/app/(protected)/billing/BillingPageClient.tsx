"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@devflow/ui";
import { PLANS } from "@/modules/billing/plans";

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
  const [upgradeLoading, setUpgradeLoading] = useState<BillingPlanKey | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const [r1, r2] = await Promise.all([
        fetch("/api/billing/subscription", { credentials: "include" }),
        fetch("/api/billing/usage", { credentials: "include" }),
      ]);
      if (!r1.ok || !r2.ok) {
        setErr("Não foi possível carregar billing.");
        return;
      }
      const j1 = await r1.json();
      const j2 = await r2.json();
      setSub(j1.data);
      setUsage(j2.data);
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
          const res = await fetch(url, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ plan }),
          });
          const j = await res.json();
          if (!res.ok) throw new Error(j.error ?? "Falha no checkout");
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
      const res = await fetch("/api/billing/upgrade", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Falha");
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
    return <p className="text-slate-600">Carregando…</p>;
  }

  return (
    <div className="space-y-8">
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

      {err && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {err}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-medium text-slate-900 mb-3">Assinatura</h2>
        {sub && (
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Plano</dt>
              <dd className="font-medium uppercase">{sub.plan}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Status</dt>
              <dd>{sub.status}</dd>
            </div>
            {sub.currentPeriodEnd && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Fim do período</dt>
                <dd>{new Date(sub.currentPeriodEnd).toLocaleDateString("pt-BR")}</dd>
              </div>
            )}
          </dl>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {sub?.stripeCustomerId ? (
            <Button type="button" onClick={() => void openPortal()} disabled={portalLoading}>
              {portalLoading ? "Abrindo…" : "Gerenciar assinatura (Stripe)"}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowUpgradeModal(true)}
          >
            Continuar usando IA
          </Button>
        </div>
      </section>

      {usage && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-medium text-slate-900">Uso do mês ({usage.period})</h2>
            <Link
              href="/settings/ai-analytics"
              className="text-sm text-blue-600 hover:underline"
            >
              Ver detalhes IA →
            </Link>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Excedente: R$ {(usage.unitPricesBrl.message).toFixed(2)}/conversa, R$ {(usage.unitPricesBrl.aiResponse).toFixed(2)}/interação IA
          </p>
          <dl className="grid gap-3 text-sm mt-3">
            <div className="flex justify-between items-center">
              <dt>Conversas</dt>
              <dd className="font-mono">
                {usage.messagesSent}
                {usage.limits.messagesPerMonth != null && (
                  <span className="text-slate-500"> / {usage.limits.messagesPerMonth}</span>
                )}
                {!usage.withinLimits.messages && (
                  <span className="ml-2 text-amber-600 text-xs">limite atingido</span>
                )}
              </dd>
            </div>
            <div className="flex justify-between items-center">
              <dt>Interações IA</dt>
              <dd className="font-mono">
                {usage.aiResponses}
                {usage.limits.aiResponsesPerMonth != null && (
                  <span className="text-slate-500"> / {usage.limits.aiResponsesPerMonth}</span>
                )}
                {!usage.withinLimits.ai && (
                  <span className="ml-2 text-amber-600 text-xs">limite atingido</span>
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
