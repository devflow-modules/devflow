"use client";

import { useSupport } from "./SupportProvider";
import { Button } from "@/components/ui/button";

type Variant = "sidebar" | "inline" | "compact";

const styles: Record<Variant, string> = {
  sidebar:
    "w-full rounded-xl border border-[var(--df-brand-200)]/90 bg-[var(--df-brand-50)]/50 px-3 py-2.5 text-left text-sm font-medium text-[var(--df-brand-800)] transition hover:bg-[var(--df-brand-50)]",
  inline:
    "rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium df-text-secondary shadow-sm transition hover:df-border-dark hover:bg-muted/60",
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
    <Button variant="secondary" type="button" onClick={openSupport} className={`${styles[variant]} ${className}`.trim()}>
      Precisa de ajuda?
    </Button>
  );
}
