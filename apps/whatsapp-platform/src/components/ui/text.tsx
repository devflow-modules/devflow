import type { HTMLAttributes } from "react";
import { cn } from "@devflow/ui";

export type TextVariant = "primary" | "secondary" | "muted";

const variantClass: Record<TextVariant, string> = {
  primary: "df-text-primary",
  secondary: "df-text-secondary",
  muted: "df-text-muted",
};

export type TextTag = "p" | "span" | "div" | "label" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

export type TextProps = {
  as?: TextTag;
  variant?: TextVariant;
} & HTMLAttributes<HTMLElement>;

export function Text({ as: Tag = "p", variant = "primary", className, ...rest }: TextProps) {
  return <Tag className={cn(variantClass[variant], className)} {...rest} />;
}
