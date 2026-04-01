"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { trackBillingCheckoutStarted, trackPricingPlanCtaClick } from "@/lib/analytics";
import { trackUpgradeClicked } from "@/modules/billing/billingAnalytics";

const AUTH_PATH = "/ferramentas/financeiro/auth";

type PlanIdPaid = "PRO" | "TEAM";

type CheckoutPhase = "idle" | "loading" | "redirecting";

function parseCheckoutError(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "Erro ao iniciar checkout";
  const p = payload as { success?: boolean; error?: { message?: string; code?: string } };
  if (p.success === false && p.error?.message) return p.error.message;
  return "Erro ao iniciar checkout";
}

type Props = {
  planId?: PlanIdPaid;
  children?: React.ReactNode;
  surface?: string;
  variant?: "primary" | "secondary";
};

export function UpgradeCta({
  planId = "PRO",
  children,
  surface = "upgrade",
  variant = "primary",
}: Props) {
  const [phase, setPhase] = useState<CheckoutPhase>("idle");
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async () => {
    setError(null);
    trackPricingPlanCtaClick({ planId, surface });
    trackUpgradeClicked({ plan: planId });
    setPhase("loading");
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          setError("Faça login para assinar.");
          setPhase("idle");
          return;
        }
        if (res.status === 503 && data?.error?.code === "BILLING_NOT_CONFIGURED") {
          setError("Pagamentos não configurados neste ambiente (Stripe de teste necessário).");
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
          /* noop */
        }
        setPhase("redirecting");
        trackBillingCheckoutStarted({ planId, surface });
        window.location.href = url;
        return;
      }
      setError("Checkout não retornou URL.");
      setPhase("idle");
    } catch (e) {
      console.error(e);
      setError("Falha de rede. Tente novamente.");
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
          "w-full rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-70",
          variant === "primary"
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "border border-border bg-background text-foreground hover:bg-muted"
        )}
      >
        {phase === "redirecting"
          ? "Abrindo checkout…"
          : phase === "loading"
            ? "Preparando…"
            : (children ?? `Assinar ${planId}`)}
      </button>
      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <p>{error}</p>
          {error.includes("login") ? (
            <Link href={AUTH_PATH} className="mt-2 inline-block font-semibold underline">
              Ir para login
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
