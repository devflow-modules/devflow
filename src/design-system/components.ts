/**
 * DevFlow Labs — Especificações de componentes
 * UI kit consistente
 */

import { colors } from "./colors";
import { spacing } from "./spacing";

export const components = {
  /** Botão primário da marca */
  button: {
    primary: {
      background: colors.primary,
      backgroundHover: colors.primaryDark,
      color: colors.primaryForeground,
      borderRadius: "0.5rem", // rounded-lg
      padding: "12px 20px",
      fontWeight: 600,
      transition: "colors 200ms",
    },
    secondary: {
      border: `1px solid ${colors.borderLight}`,
      background: "#ffffff",
      backgroundHover: colors.backgroundAlt,
      color: colors.textPrimary,
      borderRadius: "0.5rem",
      padding: "12px 20px",
      fontWeight: 600,
    },
  },

  /** Card padrão */
  card: {
    background: "#ffffff",
    border: `1px solid ${colors.border}`,
    borderRadius: "0.75rem", // rounded-xl
    padding: spacing.cardPadding,
    hoverShadow: "0 8px 30px rgba(0, 0, 0, 0.08)",
    transition: "all 200ms",
    hoverTranslate: "-4px",
  },

  /** Badge de categoria (SaaS, AI, etc.) */
  badge: {
    background: "#f1f5f9",
    color: "#334155",
    borderRadius: "0.375rem",
    padding: "2px 8px",
    fontSize: "0.75rem",
    fontWeight: 500,
  },
} as const;
