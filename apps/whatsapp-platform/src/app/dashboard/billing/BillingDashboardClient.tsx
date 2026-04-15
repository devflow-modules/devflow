"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { BILLING_PAGE_HEADER_DESCRIPTION } from "@/modules/billing/planPresentation";
import { StateError, StateLoading } from "@/components/ui/app-states";
import {
  BillingHeader,
  UsageCard,
  OverageCard,
  BillingAlerts,
  HowUsageWorksSection,
  HowFreePlanWorksSection,
} from "@/components/dashboard/billing";
import type { TenantBillingUI } from "@/modules/billing";
import { normalizePlan } from "@/modules/billing/plans";
import { freeEvaluationStaleMessage } from "@/modules/billing/demoEvaluation";
import { readBillingPostUrl } from "@/lib/api-json-client";
import { fetchProtected, protectedApiUserMessage } from "@/lib/protected-fetch";

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function BillingDashboardClient() {
  const searchParams = useSearchParams();
  const successParam = searchParams.get("success");
  const canceledParam = searchParams.get("canceled");

  const [data, setData] = useState<TenantBillingUI | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetchProtected("/api/billing/ui");
      const json = (await res.json().catch(() => ({}))) as { data?: TenantBillingUI; error?: string };
      if (!res.ok) {
        setError(protectedApiUserMessage(res.status, json));
        return;
      }
      setData(json.data !== undefined ? json.data : null);
    } catch {
      setError("Erro de rede");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function openPortal() {
    setPortalLoading(true);
    setError(null);
    const endpoints = ["/api/stripe/portal", "/api/billing/portal"];
    for (const url of endpoints) {
      try {
        const res = await fetchProtected(url, { method: "POST" });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(protectedApiUserMessage(res.status, j as { error?: string }));
        const postUrl = readBillingPostUrl(j);
        if (postUrl) {
          window.location.href = postUrl;
          return;
        }
      } catch (e) {
        if (url === endpoints[endpoints.length - 1]) {
          setError(e instanceof Error ? e.message : "Portal indisponível");
        }
      }
    }
    setPortalLoading(false);
  }

  async function checkoutOperationalBase() {
    setCheckoutBusy(true);
    setError(null);
    try {
      const endpoints = ["/api/stripe/checkout", "/api/billing/checkout"];
      for (const url of endpoints) {
        try {
          const res = await fetchProtected(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ plan: "OPERATIONAL_BASE" }),
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
      setError("Checkout indisponível");
    } finally {
      setCheckoutBusy(false);
    }
  }

  const billingHeader = (
    <PageHeader
      eyebrow="Conta"
      title="Consumo e faturação"
      description={BILLING_PAGE_HEADER_DESCRIPTION}
      layout="split"
      showDivider
      tone="admin"
      quickActions={
        <>
          <button
            type="button"
            className="df-quick-action"
            onClick={() => void openPortal()}
            disabled={portalLoading}
          >
            {portalLoading ? "A abrir…" : "Ver portal de faturação"}
          </button>
          <Link href="/settings" className="df-quick-action">
            Configurações
          </Link>
        </>
      }
    />
  );

  if (loading) {
    return (
      <div className="df-stack-tight">
        {billingHeader}
        <StateLoading message="A carregar consumo e faturação…" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="df-stack-tight">
        {billingHeader}
        <StateError message={error} onRetry={() => void load()} retryLabel="Tentar novamente" />
      </div>
    );
  }

  const d = data!;
  const isPastDue =
    d.status?.toLowerCase() === "past_due" || d.status?.toLowerCase() === "pastdue";
  const planKey = normalizePlan(d.plan);
  const isFreePlan = planKey === "FREE";
  const evaluationStaleHint = freeEvaluationStaleMessage(d.plan, d.tenantCreatedAt);

  return (
    <div className="df-stack-tight">
      {billingHeader}

      {successParam === "true" && (
        <div className="df-feedback-success" role="status">
          Assinatura atualizada com sucesso.
        </div>
      )}
      {canceledParam === "true" && (
        <div className="df-feedback-info" role="status">
          Checkout cancelado.
        </div>
      )}

      {isPastDue && (
        <div className="df-feedback-danger">
          <p className="font-medium">Pagamento falhou — atualize seu método de pagamento</p>
          <button
            type="button"
            onClick={() => void openPortal()}
            disabled={portalLoading}
            className="mt-2 text-sm font-medium text-red-700 underline hover:no-underline"
          >
            {portalLoading ? "Abrindo…" : "Resolver pagamento"}
          </button>
        </div>
      )}

      {error ? <div className="df-feedback-danger">{error}</div> : null}

      {isFreePlan ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-5 text-sm text-slate-800 shadow-sm">
          <p className="font-medium text-slate-900">Ambiente de avaliação guiada</p>
          <p className="mt-2 leading-relaxed">
            Limites atuais: conversas e IA do período estão nos cartões abaixo. O que está bloqueado ou parcial segue
            o contrato da demonstração — a operação completa libera filas, equipa e volumes na implantação.
          </p>
          {evaluationStaleHint ? (
            <p className="mt-2 rounded-lg border border-amber-100 bg-amber-50/90 px-3 py-2 text-xs text-amber-950">
              {evaluationStaleHint}
            </p>
          ) : null}
          <p className="mt-2 leading-relaxed">
            A operação comercial é consultiva (implantação + mensalidade). Se já tiver acordo connosco e quiser
            ativar o pagamento recorrente aqui, pode continuar para o Stripe.
          </p>
          <button
            type="button"
            className="mt-4 rounded-lg bg-[var(--df-brand-600)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--df-brand-700)] disabled:opacity-60"
            disabled={checkoutBusy}
            onClick={() => void checkoutOperationalBase()}
          >
            {checkoutBusy ? "A redirecionar…" : "Ativar operação completa (Stripe)"}
          </button>
        </div>
      ) : null}

      <BillingHeader
        plan={d.plan}
        status={d.status}
        hasStripeCustomer={d.hasStripeCustomer}
        onManageSubscription={() => void openPortal()}
        manageLoading={portalLoading}
      />

      {d.allowsMeteredOverage ? (
        <HowUsageWorksSection
          unitPrices={{ message: d.messageUnitPriceBrl, aiResponse: d.aiUnitPriceBrl }}
        />
      ) : (
        <HowFreePlanWorksSection planKey={normalizePlan(d.plan)} />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <UsageCard
          title="Volume de conversas"
          used={d.messagesUsed}
          limit={d.messagesLimit}
          percentage={d.usagePercentageMessages}
          includedKindLabel="conversas incluídas"
        />
        <UsageCard
          title="IA de atendimento"
          used={d.aiUsed}
          limit={d.aiLimit}
          percentage={d.usagePercentageAI}
          includedKindLabel="interações de IA incluídas"
        />
      </div>

      <BillingAlerts
        currentPlan={d.plan}
        usagePercentageMessages={d.usagePercentageMessages}
        usagePercentageAI={d.usagePercentageAI}
        enforceLimits={d.enforceLimits}
        overageMessages={d.overageMessages}
        overageAI={d.overageAI}
        messagesUsed={d.messagesUsed}
        messagesLimit={d.messagesLimit}
        aiUsed={d.aiUsed}
        aiLimit={d.aiLimit}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <OverageCard
          overageMessages={d.overageMessages}
          overageAI={d.overageAI}
          estimatedCost={d.estimatedOverageCost}
        />

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:col-span-2 lg:col-span-2">
          <h3 className="text-sm font-medium text-slate-600">Próxima cobrança</h3>
          <p className="mt-1 text-slate-900">
            {d.nextInvoiceDate
              ? new Date(d.nextInvoiceDate).toLocaleDateString("pt-BR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : "—"}
          </p>
          {d.lastInvoiceAmount != null && d.lastInvoiceAmount > 0 && (
            <p className="mt-1 text-sm text-slate-600">
              Última fatura: {formatBRL(d.lastInvoiceAmount)}{" "}
              {d.lastInvoiceStatus && (
                <span className="text-slate-500">({d.lastInvoiceStatus})</span>
              )}
            </p>
          )}
        </div>
      </div>

      <p className="text-center text-sm text-slate-500">
        <Link href="/dashboard" className="font-medium text-[var(--df-brand-700)] hover:underline">
          ← Voltar ao painel
        </Link>
      </p>
    </div>
  );
}
