import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

export type ApplyFlowCardVariant = "default" | "muted" | "highlight" | "danger" | "success" | "warning";

const variantClass: Record<ApplyFlowCardVariant, string> = {
  default:
    "border-[color:var(--af-border)] bg-[color:var(--af-surface)] shadow-[var(--af-shadow)] transition-[border-color,box-shadow,background-color] hover:border-emerald-500/20 hover:shadow-[var(--af-shadow-elevated)]",
  muted:
    "border-[color:var(--af-border)] bg-[color:var(--af-surface-muted)] transition-[border-color,box-shadow,background-color] hover:border-emerald-500/20 hover:bg-[color:var(--af-surface)]/90 hover:shadow-md",
  highlight:
    "border-emerald-500/40 bg-emerald-950/25 shadow-none transition-[border-color,background-color] hover:border-emerald-400/55",
  danger: "border-red-500/45 bg-red-950/30 shadow-none",
  success: "border-emerald-500/35 bg-emerald-950/25 shadow-none",
  warning: "border-amber-500/45 bg-amber-950/28 shadow-none",
};

export function ApplyFlowCard({
  variant = "default",
  padding = "md",
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & {
  variant?: ApplyFlowCardVariant;
  padding?: "none" | "sm" | "md" | "lg";
}) {
  const pad =
    padding === "none"
      ? ""
      : padding === "sm"
        ? "p-4"
        : padding === "lg"
          ? "p-6 sm:p-7"
          : "p-4 sm:p-5";

  return (
    <div
      className={cn(
        "rounded-[var(--af-radius)] border",
        variantClass[variant],
        pad,
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
