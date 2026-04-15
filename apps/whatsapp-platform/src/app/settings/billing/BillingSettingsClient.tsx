"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@devflow/ui";
import { StateError, StateLoading } from "@/components/ui/app-states";
import { HowFreePlanWorksSection } from "@/components/dashboard/billing/HowFreePlanWorksSection";
import { HowUsageWorksSection } from "@/components/dashboard/billing/HowUsageWorksSection";
import { normalizePlan } from "@/modules/billing/plans";
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
  allowsMeteredOverage?: boolean;
  enforceLimits: boolean;
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

  async function openPortal() {
    setPortalLoading(true);
    setErr(null);
    try {
      const res = await fetchProtected("/api/billing/portal", { method: "POST" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(protectedApiUserMessage(res.status, j as { error?: string }));
      const url = readBillingPostUrl(j);
      if (!url) throw new Error("URL do portal não disponível.");
      window.location.href = url;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Portal indisponível");
    } finally {
      setPortalLoading(false);
    }
  }

  async function checkoutOperational() {
    setCheckoutLoading("OPERATIONAL_BASE");
    setErr(null);
    try {
      const res = await fetchProtected("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "OPERATIONAL_BASE" }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(protectedApiUserMessage(res.status, j as { error?: string }));
      const url = readBillingPostUrl(j);
      if (!url) throw new Error("URL de checkout não disponível.");
      window.location.href = url;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Checkout indisponível");
    } finally {
      setCheckoutLoading(null);
    }
  }

  if (loading) {
    return <StateLoading message="A carregar faturação…" className="min-h-[14rem]" />;
  }

  return (
    <div className="min-w-0 space-y-8">
      {err ? (
        <StateError
          title="Não foi possível carregar os dados"
          message={err}
          onRetry={() => {
            setLoading(true);
            void load();
          }}
        />
      ) : null}

      <section className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-900/[0.03] sm:p-6">
        <h2 className="mb-1 text-lg font-bold tracking-tight text-slate-900">Assinatura</h2>
        <p className="mb-3 text-sm text-slate-600">
          Plano ativo, renovação e faturação via Stripe. Limites técnicos e enforcement continuam definidos no
          servidor — aqui vê o estado e acede ao portal.
        </p>
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
              {portalLoading ? "Abrindo…" : "Portal Stripe (faturas e pagamento)"}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={() => void checkoutOperational()}
            disabled={!!checkoutLoading}
          >
            {checkoutLoading === "OPERATIONAL_BASE" ? "…" : "Ativar operação contratada (Stripe)"}
          </Button>
        </div>
      </section>

      {usage &&
        (usage.allowsMeteredOverage !== false ? (
          <HowUsageWorksSection unitPrices={usage.unitPricesBrl} />
        ) : (
          <HowFreePlanWorksSection planKey={normalizePlan(sub?.plan ?? "FREE")} />
        ))}

      {usage && (
        <section className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-900/[0.03] sm:p-6">
          <h2 className="mb-1 text-lg font-bold tracking-tight text-slate-900">Uso do mês ({usage.period})</h2>
          <p className="text-xs text-slate-500 mb-4">
            Custos variáveis são estimados com base nos preços configurados no servidor (env).
          </p>
          <dl className="grid gap-3 text-sm">
            <div className="flex justify-between items-center">
              <dt>Volume de conversas (enviadas)</dt>
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
        Administradores: fluxo técnico de billing e enforcement está em{" "}
        <code className="rounded bg-slate-100 px-1">docs/billing/BILLING_FLOW.md</code> — separado da narrativa de
        produto na interface.
      </p>
    </div>
  );
}
