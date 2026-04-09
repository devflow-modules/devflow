"use client";

import { useSupport } from "./SupportProvider";

type Variant = "sidebar" | "inline" | "compact";

const styles: Record<Variant, string> = {
  sidebar:
    "w-full rounded-xl border border-[var(--df-brand-200)]/90 bg-[var(--df-brand-50)]/50 px-3 py-2.5 text-left text-sm font-medium text-[var(--df-brand-800)] transition hover:bg-[var(--df-brand-50)]",
  inline:
    "rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50",
  compact: "text-sm font-medium text-[var(--df-brand-700)] underline-offset-2 hover:underline",
};

export function SupportHelpButton({
  variant = "inline",
  className = "",
}: {
  variant?: Variant;
  className?: string;
}) {
  const { openSupport } = useSupport();
  return (
    <button type="button" onClick={openSupport} className={`${styles[variant]} ${className}`.trim()}>
      Precisa de ajuda?
    </button>
  );
}
