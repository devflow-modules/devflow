"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { trackPricingPlanCtaClick, trackBillingCheckoutStarted } from "@/lib/analytics";
import { financeiroAppUrl } from "@/lib/financeiro-app-url";
import { trackUpgradeClicked } from "@/modules/billing/billingAnalytics";
import type { PlanId } from "@/modules/billing/plans";
import { FINANCEIRO_AUTH_PATH } from "@/modules/financeiro/navigation/constants";

const checkoutEndpoint = () => financeiroAppUrl("/api/billing/checkout");
const authEntryUrl = () => financeiroAppUrl(FINANCEIRO_AUTH_PATH);

type CheckoutPhase = "idle" | "loading" | "redirecting";

type Props = {
  planId: PlanId;
  isPro: boolean;
  surface?: string;
};

function parseCheckoutError(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "Erro ao iniciar checkout";
  const p = payload as { success?: boolean; error?: { message?: string; code?: string } };
  if (p.success === false && p.error?.message) return p.error.message;
  return "Erro ao iniciar checkout";
}

export function PricingPlanCta({ planId, isPro, surface = "pricing" }: Props) {
  const [phase, setPhase] = useState<CheckoutPhase>("idle");
  const [error, setError] = useState<string | null>(null);

  if (planId === "FREE") {
    return (
      <div className="space-y-2">
        <Link
          href="/ferramentas/financeiro"
          onClick={() => {
            trackPricingPlanCtaClick({ planId: "FREE", surface });
            trackUpgradeClicked({ plan: "FREE" });
          }}
          className="inline-block w-full rounded-xl border border-border bg-background px-4 py-2.5 text-center text-sm font-semibold text-foreground hover:bg-muted"
        >
          Começar no Financeiro grátis
        </Link>
        <p className="text-center text-xs text-muted-foreground">Sem cartão · 1 casa e regras básicas</p>
      </div>
    );
  }

  const handleUpgrade = async () => {
    setError(null);
    trackPricingPlanCtaClick({ planId, surface });
    trackUpgradeClicked({ plan: planId });
    setPhase("loading");
    try {
      const res = await fetch(checkoutEndpoint(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          setError("Faça login para assinar. Usamos o mesmo acesso do Financeiro.");
          setPhase("idle");
          return;
        }
        if (res.status === 503 && data?.error?.code === "BILLING_NOT_CONFIGURED") {
          setError(
            "Stripe ainda não configurado neste ambiente — em demo, use chaves de teste ou siga o runbook de billing."
          );
          setPhase("idle");
          return;
        }
        setError(parseCheckoutError(data));
        setPhase("idle");
        return;
      }

      const url = data?.data?.checkoutUrl as string | undefined;
      if (url) {
        try {
          sessionStorage.setItem(
            "billing_checkout_pending",
            JSON.stringify({ planId, startedAt: Date.now() })
          );
        } catch {
          /* ignore */
        }
        setPhase("redirecting");
        trackBillingCheckoutStarted({ planId, surface });
        window.location.href = url;
        return;
      }
      setError("Checkout não retornou URL. Verifique o Stripe.");
      setPhase("idle");
    } catch (e) {
      console.error(e);
      setError("Falha de rede. Tente de novo em instantes.");
      setPhase("idle");
    }
  };

  const busy = phase === "loading" || phase === "redirecting";

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleUpgrade}
        disabled={busy}
        className={cn(
          "inline-block w-full rounded-xl px-4 py-3 text-center text-sm font-semibold disabled:opacity-70",
          isPro
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "border border-border bg-background text-foreground hover:bg-muted"
        )}
      >
        {phase === "redirecting"
          ? "Abrindo checkout seguro…"
          : phase === "loading"
            ? "Preparando Stripe…"
            : planId === "PRO"
              ? "Assinar PRO"
              : "Assinar TEAM"}
      </button>
      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <p>{error}</p>
          {error.includes("login") ? (
            <Link href={authEntryUrl()} className="mt-2 inline-block font-semibold underline">
              Ir para login
            </Link>
          ) : null}
        </div>
      ) : (
        <p className="text-center text-xs text-muted-foreground">Pagamento seguro via Stripe · você confirma o valor lá</p>
      )}
    </div>
  );
}
