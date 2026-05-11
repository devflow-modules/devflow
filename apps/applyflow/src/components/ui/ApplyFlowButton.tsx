import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

const base =
  "inline-flex items-center justify-center rounded-[var(--af-radius-sm)] font-medium transition-[filter,background,color,border-color,box-shadow,transform] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--af-brand)] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]";

const variants = {
  primary:
    "border border-emerald-400/20 bg-[color:var(--af-brand)] text-[color:var(--af-on-brand)] shadow-[var(--af-glow-brand)] hover:brightness-110 hover:shadow-[0_0_48px_-6px_rgba(52,211,153,0.55)]",
  secondary:
    "border border-[color:var(--af-border-strong)] bg-[color:var(--af-surface-muted)] text-[color:var(--af-text)] hover:border-emerald-500/25 hover:bg-[color:var(--af-surface)] hover:shadow-sm",
  outlineBrand:
    "border border-emerald-500/50 bg-[color:var(--af-brand-soft)] text-emerald-200 hover:border-emerald-400/70 hover:bg-emerald-500/18 hover:shadow-[0_0_32px_-10px_rgba(52,211,153,0.35)]",
  ghost:
    "border border-[color:var(--af-border)] bg-transparent text-[color:var(--af-text-muted)] hover:border-[color:var(--af-border-strong)] hover:text-[color:var(--af-text)]",
  dangerGhost: "border-0 bg-transparent text-[color:var(--af-danger)] underline-offset-2 hover:underline",
} as const;

const sizes = {
  sm: "px-3 py-2 text-xs",
  md: "px-4 py-2.5 text-sm",
  lg: "min-w-[200px] px-6 py-3 text-sm",
} as const;

export type ApplyFlowButtonVariant = keyof typeof variants;
export type ApplyFlowButtonSize = keyof typeof sizes;

export function applyFlowButtonClass({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ApplyFlowButtonVariant;
  size?: ApplyFlowButtonSize;
  className?: string;
}): string {
  return cn(base, variants[variant], sizes[size], className);
}

export function ApplyFlowButton({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ApplyFlowButtonVariant;
  size?: ApplyFlowButtonSize;
}) {
  return <button type={type} className={applyFlowButtonClass({ variant, size, className })} {...props} />;
}
