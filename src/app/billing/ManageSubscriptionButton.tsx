"use client";

import { useState } from "react";
import { financeiroAppUrl } from "@/lib/financeiro-app-url";
import { trackSubscriptionManageClicked } from "@/modules/billing/billingAnalytics";

const customerPortalEndpoint = () => financeiroAppUrl("/api/billing/customer-portal");

export function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false);

  const handleManage = async () => {
    trackSubscriptionManageClicked({});
    setLoading(true);
    try {
      const res = await fetch(customerPortalEndpoint(), { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        const msg = data?.message ?? "Erro ao abrir portal";
        alert(msg);
        return;
      }
      const url = data?.data?.portalUrl;
      if (url) {
        window.location.href = url;
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao abrir portal. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleManage}
      disabled={loading}
      className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-70 sm:w-auto"
    >
      {loading ? "Abrindo portal..." : "Gerenciar assinatura"}
    </button>
  );
}
