import * as React from "react";
import { cn } from "./lib/cn";

type BadgeVariant = "default" | "tech" | "primary";

type BadgeProps = {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
};

const variantClasses: Record<BadgeVariant, string> = {
  default:
    "rounded-md border border-border bg-card px-2 py-0.5 text-xs font-medium df-text-secondary",
  tech: "rounded-lg border border-accent/30 bg-accent/5 px-4 py-2 text-xs font-medium df-text-secondary",
  primary:
    "rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span className={cn(variantClasses[variant], className)}>{children}</span>
  );
}
