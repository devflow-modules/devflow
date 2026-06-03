"use client";

import Link from "next/link";

/** Faixa fixa quando `NEXT_PUBLIC_DEMO_MODE=true` — dados fictícios para portfólio. */
export function ShowcaseDemoBanner() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") return null;

  return (
    <div
      role="status"
      className="shrink-0 border-b border-amber-200/90 bg-amber-50 px-4 py-2 text-center text-xs text-amber-950"
    >
      <span className="font-semibold">Modo vitrine (demo)</span>
      <span className="mx-1.5 text-amber-800/80">·</span>
      Dados fictícios — sem WhatsApp, Stripe ou base real.
      <span className="mx-1.5 text-amber-800/80">·</span>
      <Link
        href="/onboarding"
        className="font-medium text-amber-900 underline decoration-amber-400/80 underline-offset-2 hover:text-amber-950"
      >
        Tour sugerido
      </Link>
    </div>
  );
}
