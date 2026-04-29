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
        className="df-btn-secondary w-full rounded-xl px-4 py-2.5 text-center text-sm font-medium"
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
        "w-full rounded-xl px-4 py-2.5 text-center text-sm font-semibold",
        loading && "df-btn-disabled",
        isPro
          ? "df-btn-primary"
          : "df-btn-secondary"
      )}
    >
      {loading ? "Redirecionando..." : "Fazer upgrade"}
    </button>
  );
}
