import type { ButtonHTMLAttributes, ReactNode } from "react";

export const buttonVariantClasses = {
  primary:
    "bg-[var(--df-brand-600)] text-white hover:bg-[var(--df-brand-700)] border border-transparent shadow-[0_1px_2px_rgba(15,23,42,0.08)] hover:shadow-md",
  secondary:
    "bg-[var(--df-bg-elevated)] text-[var(--df-text-primary)] border border-[var(--df-border-subtle)] hover:bg-[var(--df-brand-100)] shadow-sm",
  ghost:
    "bg-transparent text-[var(--df-text-secondary)] hover:bg-[var(--df-brand-100)] border border-transparent",
  destructive:
    "bg-red-600 text-white hover:bg-red-700 border border-transparent shadow-sm focus-visible:ring-red-500/35",
  admin:
    "bg-[var(--df-admin-50)] text-[var(--df-admin-900)] border border-[var(--df-warning-border)] hover:bg-[var(--df-admin-100)] shadow-sm focus-visible:ring-amber-500/30",
} as const;

type Variant = keyof typeof buttonVariantClasses;

export function buttonClassName(variant: Variant = "primary", className = "") {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-[background,box-shadow,colors] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--df-brand-500)]/30 focus-visible:ring-offset-2";
  return `${base} ${buttonVariantClasses[variant]} ${className}`.trim();
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
};

export function Button({ variant = "primary", className = "", type = "button", children, ...rest }: Props) {
  return (
    <button
      type={type}
      className={`${buttonClassName(variant)} disabled:pointer-events-none disabled:opacity-45 ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
}
