"use client";

/**
 * No app Financeiro não exibimos header/footer do site; apenas o conteúdo.
 * Mantido para compatibilidade com imports existentes.
 */
export function BodyChrome({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
