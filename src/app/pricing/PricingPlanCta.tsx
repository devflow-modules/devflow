"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { trackUpgradeClicked } from "@/modules/billing/billingAnalytics";
import type { PlanId } from "@/modules/billing/plans";

type Props = {
  planId: PlanId;
  isPro: boolean;
};

export function PricingPlanCta({ planId, isPro }: Props) {
  const [loading, setLoading] = useState(false);

  if (planId === "FREE") {
    return (
      <Link
        href="/ferramentas/financeiro"
        className="inline-block w-full rounded-xl border border-border bg-background px-4 py-2.5 text-center text-sm font-medium text-foreground hover:bg-muted"
      >
        Começar grátis
      </Link>
    );
  }

  const handleUpgrade = async () => {
    trackUpgradeClicked({ plan: planId });
    setLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data?.message ?? "Erro ao iniciar checkout";
        alert(msg);
        return;
      }
      const url = data?.data?.checkoutUrl;
      if (url) {
        window.location.href = url;
      } else {
        alert("Checkout não configurado. Entre em contato.");
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao iniciar checkout. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleUpgrade}
      disabled={loading}
      className={cn(
        "inline-block w-full rounded-xl px-4 py-2.5 text-center text-sm font-semibold disabled:opacity-70",
        isPro
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "border border-border bg-background text-foreground hover:bg-muted"
      )}
    >
      {loading ? "Redirecionando..." : "Fazer upgrade"}
    </button>
  );
}
