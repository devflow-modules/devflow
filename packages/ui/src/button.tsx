import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "./lib/cn";

/** API herdada tipo shadcn + variantes específicas DevFlow (`primary`, `disabled`, `admin`). */
export type ButtonVariantPublic =
  | "default"
  | "outline"
  | "secondary"
  | "ghost"
  | "destructive"
  | "link"
  | "admin"
  | "primary"
  | "disabled";

/** @deprecated Use `ButtonVariantPublic`. */
export type UiButtonVariant = Extract<
  ButtonVariantPublic,
  "default" | "outline" | "secondary" | "ghost" | "destructive" | "link"
>;

export type ButtonSize = "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";

export const buttonVariantClasses = {
  destructive:
    "bg-red-600 text-white hover:bg-red-700 border border-transparent shadow-sm focus-visible:ring-red-500/35",
  admin:
    "bg-[var(--df-admin-50)] text-[var(--df-admin-900)] border border-[var(--df-warning-border)] hover:bg-[var(--df-admin-100)] shadow-sm focus-visible:ring-amber-500/30",
} as const;

export type DevFlowButtonVariant = "primary" | "secondary" | "ghost" | "disabled";
export type LegacyVariant = keyof typeof buttonVariantClasses;
export type ButtonClassNameVariant =
  | ButtonVariantPublic
  | LegacyVariant
  | DevFlowButtonVariant;

type StyleVariant =
  | "default"
  | "outline"
  | "secondary"
  | "ghost"
  | "destructive"
  | "link"
  | "admin";

const legacyBase =
  "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-[background,box-shadow,colors] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--df-brand-500)]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--df-bg-app)] disabled:pointer-events-none disabled:opacity-50";

const destructiveFull = cn(
  legacyBase,
  buttonVariantClasses.destructive,
  "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
);

const adminFull = cn(
  legacyBase,
  buttonVariantClasses.admin,
  "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
);

const dfVariantClass: Record<Exclude<StyleVariant, "destructive" | "admin">, string> = {
  default: cn(
    "df-btn-primary transition-all duration-200 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ),
  outline: cn(
    "df-btn-secondary transition-all duration-200 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ),
  secondary: cn(
    "df-btn-secondary transition-all duration-200 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ),
  ghost: cn(
    "df-btn-ghost transition-all duration-200 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ),
  link: cn(
    "df-btn-ghost transition-all duration-200 underline-offset-4 hover:underline [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ),
};

const sizeOverrides: Record<ButtonSize, string> = {
  default: "",
  xs: "!min-h-6 !rounded-[min(var(--df-radius-md,0.75rem),10px)] !gap-1 !px-2 !py-1 !text-xs",
  sm: "!min-h-7 !gap-1 !rounded-[min(var(--df-radius-md,0.75rem),12px)] !px-2.5 !py-1 !text-[0.8rem]",
  lg: "!min-h-9 !px-6 !py-3",
  icon: "!size-8 !rounded-lg !px-0 !py-0",
  "icon-xs": "!size-6 !rounded-[min(var(--df-radius-md,0.75rem),10px)] !px-0 !py-0 [&_svg:not([class*='size-'])]:!size-3",
  "icon-sm": "!size-7 !rounded-[min(var(--df-radius-md,0.75rem),12px)] !px-0 !py-0",
  "icon-lg": "!size-9 !px-0 !py-0",
};

function toStyleVariant(v: ButtonClassNameVariant): StyleVariant {
  switch (v) {
    case "primary":
    case "default":
      return "default";
    case "disabled":
      return "secondary";
    case "outline":
      return "outline";
    case "secondary":
      return "secondary";
    case "ghost":
      return "ghost";
    case "link":
      return "link";
    case "destructive":
      return "destructive";
    case "admin":
      return "admin";
    default:
      return "default";
  }
}

function classesForStyleVariant(v: StyleVariant): string {
  if (v === "destructive") return destructiveFull;
  if (v === "admin") return adminFull;
  return dfVariantClass[v];
}

export function buttonClassName(
  variant: ButtonClassNameVariant = "primary",
  className?: string,
  options?: { disabled?: boolean },
) {
  const dis = options?.disabled || variant === "disabled";
  const styleV = toStyleVariant(variant);
  return cn(classesForStyleVariant(styleV), dis && "df-btn-disabled", className);
}

function extractButtonLabel(children: React.ReactNode): string | undefined {
  if (typeof children === "string") return children.trim();
  if (typeof children === "number") return String(children);
  return undefined;
}

export function buttonVariants(opts: {
  variant: ButtonVariantPublic;
  size?: ButtonSize;
  className?: string;
  disabled?: boolean;
}): string {
  const sz = opts.size ?? "default";
  const effDisabled = opts.disabled || opts.variant === "disabled";
  const styleV = toStyleVariant(opts.variant);
  return cn(
    classesForStyleVariant(styleV),
    sizeOverrides[sz],
    effDisabled && "pointer-events-none opacity-50 df-btn-disabled",
    opts.className,
  );
}

export type ButtonProps = React.ComponentProps<"button"> & {
  variant: ButtonVariantPublic;
  size?: ButtonSize;
  asChild?: boolean;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size = "default", asChild = false, disabled, onClick, children, type, ...props },
  ref,
) {
  const effDisabled = disabled || variant === "disabled";
  const mergedClass = buttonVariants({
    variant,
    size,
    className,
    disabled: effDisabled,
  });

  const trackedOnClick: React.MouseEventHandler<HTMLButtonElement> = (event) => {
    const label = (props["aria-label"] as string | undefined)?.trim() || extractButtonLabel(children);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("devflow:button-click", {
          detail: { variant, label },
        }),
      );
    }
    onClick?.(event);
  };

  const Comp = asChild ? Slot : "button";

  if (asChild) {
    return (
      <Comp
        ref={ref as never}
        data-slot="button"
        data-variant={variant}
        data-size={size}
        className={mergedClass}
        onClick={trackedOnClick as React.MouseEventHandler<HTMLElement>}
        {...props}
      >
        {children}
      </Comp>
    );
  }

  return (
    <button
      ref={ref}
      type={type ?? "button"}
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={mergedClass}
      disabled={effDisabled}
      onClick={trackedOnClick}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = "Button";
