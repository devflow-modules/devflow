import type { ReactNode } from "react";

/** Badges alinhados a `globals.css` (`.df-badge-*`). Preferir a estilos genéricos do pacote UI quando for só cosmética. */
export type AppBadgeVariant = "neutral" | "brand" | "admin" | "success" | "danger" | "muted";

const variantClass: Record<AppBadgeVariant, string> = {
  neutral: "df-badge",
  brand: "df-badge-brand",
  admin: "df-badge-admin",
  success: "df-badge-success",
  danger: "df-badge-danger",
  muted: "df-badge-muted",
};

type Props = {
  children: ReactNode;
  variant?: AppBadgeVariant;
  className?: string;
};

export function AppBadge({ children, variant = "neutral", className = "" }: Props) {
  return <span className={`${variantClass[variant]} ${className}`.trim()}>{children}</span>;
}
