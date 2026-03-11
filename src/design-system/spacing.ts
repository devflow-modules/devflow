/**
 * DevFlow Labs — Espaçamento e grid
 * Padrão moderno SaaS
 */

export const spacing = {
  /** Padding vertical das seções */
  sectionPadding: "6rem", // 96px / py-24
  /** Largura máxima do container */
  containerMax: 1200,
  /** Gap entre cards */
  cardGap: "1.5rem", // 24px / gap-6
  /** Padding dos cards */
  cardPadding: "1.5rem", // 24px / p-6
} as const;

export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;
