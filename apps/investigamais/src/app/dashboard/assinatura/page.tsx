"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type BillingStatus = {
  plan: string;
  remaining_queries: number;
  canUsePortal: boolean;
};

const QUERIES_BY_PLAN: Record<string, number> = { free: 10, standard: 50, pro: 200 };

export default function AssinaturaPage() {
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    fetch("/api/billing/status", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setBilling)
      .catch(() => setBilling(null))
      .finally(() => setLoading(false));
  }, []);

  async function openPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ returnUrl: `${window.location.origin}/dashboard/assinatura` }),
      });
      const data = await res.json();
      if (data.portalUrl) window.location.href = data.portalUrl;
      else alert(data.error ?? "Erro ao abrir portal");
    } finally {
      setPortalLoading(false);
    }
  }

  if (loading) return <div className="min-h-screen p-6">Carregando…</div>;
  if (!billing) {
    return (
      <div className="min-h-screen p-6">
        <h1 className="text-2xl font-semibold">Assinatura</h1>
        <Link href="/dashboard" className="text-blue-600 underline">
          Voltar
        </Link>
        <p className="mt-4 df-text-secondary">Não foi possível carregar os dados.</p>
      </div>
    );
  }

  const limit = QUERIES_BY_PLAN[billing.plan] ?? 10;

  return (
    <div className="min-h-screen p-6">
      <h1 className="text-2xl font-semibold">Assinatura</h1>
      <Link href="/dashboard" className="text-blue-600 underline">
        Voltar
      </Link>

      <div className="mt-6 max-w-md space-y-4 rounded-lg border p-6">
        <div>
          <p className="text-sm df-text-secondary">Plano atual</p>
          <p className="text-xl font-medium capitalize">{billing.plan}</p>
        </div>
        <div>
          <p className="text-sm df-text-secondary">Consultas no período</p>
          <p className="text-xl font-medium">
            {billing.remaining_queries} / {limit}
          </p>
        </div>
        {billing.remaining_queries <= 0 && (
          <p className="text-sm text-amber-600">
            Saldo esgotado. Faça upgrade para continuar consultando.
          </p>
        )}
        {billing.canUsePortal && (
          <Button variant="disabled"
            type="button"
            onClick={openPortal}
            disabled={portalLoading}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {portalLoading ? "Abrindo…" : "Gerenciar assinatura (Stripe)"}
          </Button>
        )}
        {!billing.canUsePortal && (
          <p className="text-sm df-text-muted">
            Vincule uma assinatura para gerenciar pelo portal. (Integração Stripe em configuração.)
          </p>
        )}
      </div>
    </div>
  );
}
