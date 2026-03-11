/**
 * DevFlow Labs — Paleta de cores da marca
 * Software Engineering • Automation • AI Systems • Digital Products
 */

export const colors = {
  /** Verde automação / AI — botões, CTA, links, estados ativos */
  primary: "#22c55e",
  /** Hover / estados ativos do primary */
  primaryDark: "#16a34a",
  /** Texto em botões primary */
  primaryForeground: "#ffffff",

  /** Azul escuro tecnológico */
  backgroundDark: "#0f172a",
  /** Fundo principal claro */
  backgroundLight: "#f8fafc",
  /** Seções alternadas */
  backgroundAlt: "#f1f5f9",

  /** Texto principal */
  textPrimary: "#0f172a",
  /** Subtextos */
  textSecondary: "#475569",
  /** Texto muted */
  textMuted: "#64748b",
  /** Texto em seções escuras */
  textLight: "#f8fafc",

  /** Azul tecnologia — elementos técnicos, gráficos, badges */
  accent: "#38bdf8",
  accentDark: "#0ea5e9",

  /** Bordas */
  border: "#e5e7eb",
  borderLight: "#e2e8f0",

  /** WhatsApp — manter para reconhecimento de CTA */
  whatsapp: "#25d366",
  whatsappHover: "#20bd5a",
} as const;

export type Colors = typeof colors;
