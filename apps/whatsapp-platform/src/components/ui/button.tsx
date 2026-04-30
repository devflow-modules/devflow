import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@devflow/ui";

/** Variantes legacy (fora do trio `df-btn-*` principal). */
export const buttonVariantClasses = {
  destructive:
    "bg-red-600 text-white hover:bg-red-700 border border-transparent shadow-sm focus-visible:ring-red-500/35",
  admin:
    "bg-[var(--df-admin-50)] text-[var(--df-admin-900)] border border-[var(--df-warning-border)] hover:bg-[var(--df-admin-100)] shadow-sm focus-visible:ring-amber-500/30",
} as const;

export type DevFlowButtonVariant = "primary" | "secondary" | "ghost" | "disabled";

const shellVariantClass: Record<Exclude<DevFlowButtonVariant, "disabled">, string> = {
  primary: "df-btn-primary transition-all duration-200",
  secondary: "df-btn-secondary transition-all duration-200",
  ghost: "df-btn-ghost transition-all duration-200",
};

type LegacyVariant = keyof typeof buttonVariantClasses;
export type ButtonVariant = DevFlowButtonVariant | LegacyVariant;

const legacyBase =
  "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-[background,box-shadow,colors] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--df-brand-500)]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--df-bg-app)] disabled:pointer-events-none disabled:opacity-50";

export function buttonClassName(
  variant: ButtonVariant = "primary",
  className?: string,
  options?: { disabled?: boolean },
) {
  if (variant === "destructive" || variant === "admin") {
    return cn(legacyBase, buttonVariantClasses[variant], className);
  }

  const dis = options?.disabled || variant === "disabled";
  const baseKey: Exclude<DevFlowButtonVariant, "disabled"> =
    variant === "disabled" ? "secondary" : variant;
  return cn(shellVariantClass[baseKey], dis && "df-btn-disabled", className);
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children?: ReactNode;
};

function extractButtonLabel(children: ButtonProps["children"]) {
  if (typeof children === "string") return children.trim();
  if (typeof children === "number") return String(children);
  return undefined;
}

/**
 * Botão canónico DevFlow (`df-btn-*`). Variantes `destructive` e `admin` mantêm estilos de produto sensíveis.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, className, disabled, type = "button", children, onClick, ...rest },
  ref,
) {
  if (!variant) {
    throw new Error("Button requires a variant");
  }
  const isDisabled = disabled || variant === "disabled";

  const handleClick: ButtonProps["onClick"] = (event) => {
    if (typeof window !== "undefined") {
      const label = rest["aria-label"] ?? extractButtonLabel(children);
      window.dispatchEvent(
        new CustomEvent("devflow:button-click", {
          detail: { variant, label },
        }),
      );
    }
    onClick?.(event);
  };

  return (
    <button
      ref={ref}
      type={type}
      className={buttonClassName(variant, className, { disabled: isDisabled })}
      disabled={isDisabled}
      onClick={handleClick}
      {...rest}
    >
      {children}
    </button>
  );
});
