/**
 * Nomes internos por SKU legado na BD (não mostrar ao cliente final).
 * Plano comercial único efetivo: `OPERATIONAL_BASE` (`normalizePlan`).
 */

export function internalTierLabelFromRawPlan(raw: string | null | undefined): string {
  const p = (raw ?? "").toUpperCase();
  if (p === "STARTER") return "Cliente ativo";
  if (p === "PRO") return "Operação média";
  if (p === "SCALE" || p === "TEAM") return "Operação avançada";
  if (p === "OPERATIONAL_BASE") return "Base operacional";
  if (p === "FREE" || p === "") return "Avaliação";
  return p || "—";
}
