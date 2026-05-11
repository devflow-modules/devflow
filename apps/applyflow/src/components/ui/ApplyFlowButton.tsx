import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

const base =
  "inline-flex items-center justify-center rounded-[var(--af-radius-sm)] font-medium transition-[filter,background,color,border-color] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--af-brand)] disabled:pointer-events-none disabled:opacity-50";

const variants = {
  primary: "border border-transparent bg-[color:var(--af-brand)] text-[color:var(--af-on-brand)] hover:brightness-110",
  secondary:
    "border border-[color:var(--af-border-strong)] bg-[color:var(--af-surface-muted)] text-[color:var(--af-text)] hover:border-[color:var(--af-border-strong)] hover:bg-[color:var(--af-surface)]",
  outlineBrand:
    "border border-emerald-500/45 bg-[color:var(--af-brand-soft)] text-emerald-300 hover:bg-emerald-500/15",
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
