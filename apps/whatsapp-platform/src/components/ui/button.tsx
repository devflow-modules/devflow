import type { ButtonHTMLAttributes, ReactNode } from "react";

export const buttonVariantClasses = {
  primary:
    "bg-[var(--df-brand-600)] text-white hover:bg-[var(--df-brand-700)] border border-transparent shadow-[0_1px_2px_rgba(15,23,42,0.08)] hover:shadow-md",
  secondary:
    "bg-white text-slate-700 border border-slate-200/90 hover:bg-slate-50/80 shadow-sm",
  ghost: "bg-transparent text-slate-600 hover:bg-slate-100/80 border border-transparent",
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
