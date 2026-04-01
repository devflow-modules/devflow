"use client";

import { useEffect, useRef } from "react";
import { trackBillingPortalReturn } from "@/lib/analytics";

export function BillingPortalReturnBanner() {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    trackBillingPortalReturn({ surface: "billing" });
  }, []);

  return (
    <div
      className="mb-6 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100"
      role="status"
    >
      <p className="font-semibold text-sky-900 dark:text-sky-100">Você voltou do portal Stripe</p>
      <p className="mt-1 text-sky-900/90 dark:text-sky-100/90">
        Alterações em método de pagamento, cancelamento ou upgrade costumam refletir em instantes. Se algo não aparecer,
        atualize a página ou confira o e-mail de confirmação do Stripe.
      </p>
    </div>
  );
}
