"use client";

import Link from "next/link";
import { isWhiteLabelMode } from "@/lib/productMode";

type Props = {
  message: string;
  href?: string;
};

/**
 * Dica contextual discreta sobre capacidade (Inbox, IA, canal) — não intrusiva.
 */
export function PricingContextHint({ message, href = "/dashboard/billing" }: Props) {
  if (isWhiteLabelMode()) return null;
  return (
    <div className="rounded-lg border df-border-brand bg-[color-mix(in_srgb,var(--df-bg-app)_55%,var(--df-bg-elevated))] px-3 py-2 text-center text-xs leading-relaxed text-[var(--df-text-secondary)]">
      <Link href={href} className="font-medium text-[var(--df-brand-700)] hover:underline">
        {message}
      </Link>
    </div>
  );
}
