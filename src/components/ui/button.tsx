import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type DevFlowButtonVariant = "primary" | "secondary" | "ghost" | "disabled";

/** Base alinhada ao DS (complementa `df-btn-*` em `globals.css`). */
const baseClass =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const variants: Record<Exclude<DevFlowButtonVariant, "disabled">, string> = {
  primary: "df-btn-primary",
  secondary: "df-btn-secondary",
  ghost: "df-btn-ghost",
};

export function buttonClassName(
  variant: DevFlowButtonVariant = "primary",
  className?: string,
  options?: { disabled?: boolean },
) {
  const dis = options?.disabled || variant === "disabled";
  const key: Exclude<DevFlowButtonVariant, "disabled"> = variant === "disabled" ? "secondary" : variant;
  return cn(baseClass, variants[key], dis && "df-btn-disabled", className);
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: DevFlowButtonVariant;
};

function extractButtonLabel(children: ButtonProps["children"]) {
  if (typeof children === "string") return children.trim();
  if (typeof children === "number") return String(children);
  return undefined;
}

/**
 * Botão canónico DevFlow (`df-btn-*`). Preferir a `<button className="...">` solto.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, className, disabled, type = "button", onClick, children, ...rest },
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
