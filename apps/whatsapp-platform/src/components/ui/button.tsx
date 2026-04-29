import type { ButtonHTMLAttributes, ReactNode } from "react";

/** Variantes legacy (fora do trio `df-btn-*` principal). */
export const buttonVariantClasses = {
  destructive:
    "bg-red-600 text-white hover:bg-red-700 border border-transparent shadow-sm focus-visible:ring-red-500/35",
  admin:
    "bg-[var(--df-admin-50)] text-[var(--df-admin-900)] border border-[var(--df-warning-border)] hover:bg-[var(--df-admin-100)] shadow-sm focus-visible:ring-amber-500/30",
} as const;

const shellVariantClass = {
  primary: "df-btn-primary",
  secondary: "df-btn-secondary",
  ghost: "df-btn-ghost",
} as const;

type ShellVariant = keyof typeof shellVariantClass;
type LegacyVariant = keyof typeof buttonVariantClasses;
type Variant = ShellVariant | LegacyVariant;

export function buttonClassName(variant: Variant = "primary", className = "") {
  if (variant === "primary" || variant === "secondary" || variant === "ghost") {
    return `${shellVariantClass[variant]} ${className}`.trim();
  }
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-[background,box-shadow,colors] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--df-brand-500)]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--df-bg-app)] disabled:pointer-events-none disabled:opacity-50";
  return `${base} ${buttonVariantClasses[variant]} ${className}`.trim();
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
};

export function Button({ variant = "primary", className = "", type = "button", children, ...rest }: Props) {
  return (
    <button type={type} className={`${buttonClassName(variant)} ${className}`.trim()} {...rest}>
      {children}
    </button>
  );
}
