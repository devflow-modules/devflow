/**
 * Critério compartilhado entre checklist, score e insights:
 * despesas do mês existem mas só em “Outros” / sem nome útil.
 */
export function monthHasWeakExpenseCategories(
  monthExpenses: { category?: string | null }[]
): boolean {
  if (monthExpenses.length === 0) return false;
  const meaningful = new Set(
    monthExpenses
      .map((e) => (e.category ?? "").trim())
      .filter((c) => c.length > 0 && c.toLowerCase() !== "outros")
  );
  return meaningful.size === 0;
}
