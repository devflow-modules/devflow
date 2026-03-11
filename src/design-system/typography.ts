/**
 * DevFlow Labs — Tipografia
 * Fonte principal: Inter (Vercel, Linear, Supabase)
 */

export const typography = {
  fontFamily: {
    sans: "var(--font-inter, ui-sans-serif, system-ui, sans-serif)",
    mono: "ui-monospace, 'Cascadia Code', 'Source Code Pro', monospace",
  },
  fontWeight: {
    h1: 700,
    h2: 600,
    body: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  size: {
    h1: "clamp(2rem, 5vw, 3.75rem)", // text-4xl → text-6xl
    h2: "clamp(1.5rem, 4vw, 1.875rem)", // text-2xl → text-3xl
    body: "1rem",
    bodyLg: "1.125rem",
    sm: "0.875rem",
    xs: "0.75rem",
  },
} as const;
