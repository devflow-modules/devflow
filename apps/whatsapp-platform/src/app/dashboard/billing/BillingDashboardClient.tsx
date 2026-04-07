"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  BillingHeader,
  UsageCard,
  OverageCard,
  BillingAlerts,
  UpgradeCTA,
} from "@/components/dashboard/billing";
import type { TenantBillingUI } from "@/modules/billing";
import type { PlanKey } from "@/modules/billing/plans";
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
  const [checkoutLoading, setCheckoutLoading] = useState<PlanKey | null>(null);

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
        const j = (await res.json().catch(() => ({}))) as { error?: string; data?: { url: string } };
        if (!res.ok) throw new Error(protectedApiUserMessage(res.status, j));
        if (j.data?.url) {
          window.location.href = j.data.url;
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

  async function checkout(plan: PlanKey) {
    setCheckoutLoading(plan);
    setError(null);
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
      setError("Checkout indisponível");
    } finally {
      setCheckoutLoading(null);
    }
  }

  if (loading) {
    return <p className="text-slate-600">Carregando…</p>;
  }

  if (error && !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
        {error}
      </div>
    );
  }

  const d = data!;
  const isPastDue =
    d.status?.toLowerCase() === "past_due" || d.status?.toLowerCase() === "pastdue";
  const maxPct = Math.max(d.usagePercentageMessages ?? 0, d.usagePercentageAI ?? 0);
  const showUpgradeCTA =
    maxPct >= 80 || isPastDue || d.plan?.toUpperCase() === "STARTER" || d.plan?.toUpperCase() === "FREE";

  return (
    <div className="space-y-6">
      {successParam === "true" && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Plano atualizado com sucesso.
        </div>
      )}
      {canceledParam === "true" && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Checkout cancelado.
        </div>
      )}

      {isPastDue && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3">
          <p className="font-medium text-red-900">Pagamento falhou — atualize seu método de pagamento</p>
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

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <BillingHeader
        plan={d.plan}
        status={d.status}
        hasStripeCustomer={d.hasStripeCustomer}
        onManageSubscription={() => void openPortal()}
        manageLoading={portalLoading}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <UsageCard
          title="Mensagens"
          used={d.messagesUsed}
          limit={d.messagesLimit}
          percentage={d.usagePercentageMessages}
        />
        <UsageCard
          title="Interações IA"
          used={d.aiUsed}
          limit={d.aiLimit}
          percentage={d.usagePercentageAI}
        />
      </div>

      <BillingAlerts
        usagePercentageMessages={d.usagePercentageMessages}
        usagePercentageAI={d.usagePercentageAI}
        enforceLimits={d.enforceLimits}
        overageMessages={d.overageMessages}
        overageAI={d.overageAI}
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

      <UpgradeCTA
        currentPlan={d.plan}
        shouldShow={showUpgradeCTA}
        onUpgrade={(plan) => void checkout(plan)}
        loadingPlan={checkoutLoading}
      />

      <p className="text-center text-sm text-slate-500">
        <Link href="/dashboard" className="text-blue-600 hover:underline">
          ← Voltar ao dashboard
        </Link>
      </p>
    </div>
  );
}
