import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

export type ApplyFlowBadgeTone = "neutral" | "brand" | "success" | "warning" | "danger" | "intel";

const toneClass: Record<ApplyFlowBadgeTone, string> = {
  neutral: "border-[color:var(--af-border-strong)] bg-zinc-800/50 text-[color:var(--af-text-muted)]",
  brand: "border-emerald-500/35 bg-emerald-500/10 text-emerald-300",
  success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  danger: "border-red-500/35 bg-red-500/10 text-red-300",
  intel: "border-cyan-500/30 bg-cyan-500/10 text-cyan-200",
};

export function ApplyFlowBadge({
  tone = "neutral",
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { tone?: ApplyFlowBadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide",
        toneClass[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
