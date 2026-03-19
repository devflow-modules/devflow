"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@devflow/ui";

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
  stripeMetered?: {
    messagesReportedToStripe: number;
    aiReportedToStripe: number;
    pendingStripeReports: number;
  };
};

export function BillingSettingsClient() {
  const [sub, setSub] = useState<Sub | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

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

  async function openPortal() {
    setPortalLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        credentials: "include",
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Falha");
      window.location.href = j.data.url;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Portal indisponível");
    } finally {
      setPortalLoading(false);
    }
  }

  async function checkout(plan: "PRO" | "SCALE") {
    setCheckoutLoading(plan);
    setErr(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Falha no checkout");
      window.location.href = j.data.url;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Checkout indisponível");
    } finally {
      setCheckoutLoading(null);
    }
  }

  if (loading) {
    return <p className="text-slate-600">Carregando…</p>;
  }

  return (
    <div className="space-y-8">
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
            {sub.cancelAtPeriodEnd && (
              <p className="text-amber-700 text-xs">Cancelamento agendado ao fim do período.</p>
            )}
            <div className="flex justify-between pt-2 border-t border-slate-100">
              <dt className="text-slate-500">Uso variável Stripe</dt>
              <dd>{sub.meteredBillingConfigured ? "Ativo" : "Não configurado"}</dd>
            </div>
            {sub.lastInvoiceId && (
              <>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Última invoice</dt>
                  <dd className="text-xs font-mono truncate max-w-[180px]">{sub.lastInvoiceId}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Status / pago</dt>
                  <dd>
                    {sub.lastInvoiceStatus}{" "}
                    {sub.lastInvoiceAmountPaid != null && (
                      <span className="text-slate-600">
                        ({(sub.lastInvoiceAmountPaid / 100).toFixed(2)} {sub.lastInvoiceAmountPaid > 0 ? "centavos/moeda Stripe" : ""})
                      </span>
                    )}
                  </dd>
                </div>
              </>
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
            onClick={() => void checkout("PRO")}
            disabled={!!checkoutLoading}
          >
            {checkoutLoading === "PRO" ? "…" : "Upgrade PRO"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void checkout("SCALE")}
            disabled={!!checkoutLoading}
          >
            {checkoutLoading === "SCALE" ? "…" : "Upgrade SCALE"}
          </Button>
        </div>
      </section>

      {usage && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-medium text-slate-900 mb-1">Uso do mês ({usage.period})</h2>
          <p className="text-xs text-slate-500 mb-4">
            Custos variáveis são estimados com base nos preços configurados no servidor (env).
          </p>
          <dl className="grid gap-3 text-sm">
            <div className="flex justify-between items-center">
              <dt>Mensagens enviadas (outbound)</dt>
              <dd className="font-mono">
                {usage.messagesSent}
                {usage.limits.messagesPerMonth != null && (
                  <span className="text-slate-500"> / {usage.limits.messagesPerMonth}</span>
                )}
                {!usage.withinLimits.messages && (
                  <span className="ml-2 text-amber-600 text-xs">no limite</span>
                )}
              </dd>
            </div>
            <div className="flex justify-between items-center">
              <dt>Respostas IA (automação)</dt>
              <dd className="font-mono">
                {usage.aiResponses}
                {usage.limits.aiResponsesPerMonth != null && (
                  <span className="text-slate-500"> / {usage.limits.aiResponsesPerMonth}</span>
                )}
              </dd>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-3 mt-2">
              <dt className="text-slate-600">Preço unitário (ref.)</dt>
              <dd className="text-right text-xs text-slate-600">
                msg R$ {usage.unitPricesBrl.message.toFixed(4)} · IA R${" "}
                {usage.unitPricesBrl.aiResponse.toFixed(4)}
              </dd>
            </div>
            <div className="flex justify-between font-medium">
              <dt>Custo variável estimado (local)</dt>
              <dd className="text-emerald-700">
                R$ {usage.estimatedVariableCostBrl.toFixed(2)}
              </dd>
            </div>
            {usage.stripeMetered && sub?.meteredBillingConfigured && (
              <div className="border-t border-slate-100 pt-3 mt-2 space-y-2">
                <p className="text-xs font-medium text-slate-700">Enviado ao Stripe (metered)</p>
                <div className="flex justify-between text-sm">
                  <dt>Mensagens faturáveis</dt>
                  <dd className="font-mono">
                    {usage.stripeMetered.messagesReportedToStripe} / {usage.messagesSent}
                  </dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt>IA faturável</dt>
                  <dd className="font-mono">
                    {usage.stripeMetered.aiReportedToStripe} / {usage.aiResponses}
                  </dd>
                </div>
                {usage.stripeMetered.pendingStripeReports > 0 && (
                  <p className="text-amber-700 text-xs">
                    {usage.stripeMetered.pendingStripeReports} evento(s) pendente(s) de sync — aguarde ou
                    rode o cron de retry.
                  </p>
                )}
              </div>
            )}
          </dl>
        </section>
      )}

      <p className="text-xs text-slate-500">
        Limite rígido: <code className="bg-slate-100 px-1">BILLING_ENFORCE_LIMITS=true</code>.         Metered: env{" "}
        <code className="bg-slate-100 px-1">STRIPE_METERED_PRICE_*</code> — ver{" "}
        <code className="bg-slate-100 px-1">docs/whatsapp-platform/METERED_BILLING.md</code>.
      </p>
    </div>
  );
}
