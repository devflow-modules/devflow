"use client";

import Link from "next/link";
import { isWhiteLabelMode } from "@/lib/productMode";

type Props = {
  message: string;
  href?: string;
};

/**
 * Dica contextual discreta para upgrade (Inbox, IA, canal) — não intrusiva.
 */
export function PricingContextHint({ message, href = "/dashboard/billing" }: Props) {
  if (isWhiteLabelMode()) return null;
  return (
    <div className="rounded-lg border border-slate-200/80 bg-slate-50/90 px-3 py-2 text-center text-xs leading-relaxed text-slate-600">
      <Link href={href} className="font-medium text-[var(--df-brand-700)] hover:underline">
        {message}
      </Link>
    </div>
  );
}
