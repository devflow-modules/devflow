"use client";

import { useState } from "react";
import { trackUpgradeClicked } from "@/modules/billing/billingAnalytics";
type PlanIdPaid = "PRO" | "TEAM";

type Props = {
  planId?: PlanIdPaid;
  children?: React.ReactNode;
};

export function UpgradeCta({ planId = "PRO", children }: Props) {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    trackUpgradeClicked({});
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
      className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-70"
    >
      {loading ? "Redirecionando..." : children ?? "Upgrade para PRO"}
    </button>
  );
}
