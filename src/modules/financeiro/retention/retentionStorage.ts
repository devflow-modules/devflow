const SCORE_KEY = (householdId: string) => `financeiro_retention_score_${householdId}`;
const LAST_ENTRY_KEY = (householdId: string) => `financeiro_retention_last_entry_date_${householdId}`;

export function readRetentionStoredScore(householdId: string): number | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SCORE_KEY(householdId));
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function writeRetentionStoredScore(householdId: string, score: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SCORE_KEY(householdId), String(score));
}

export function readLastMovementDate(householdId: string): string | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(LAST_ENTRY_KEY(householdId));
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

/** Chamar após criar receita/despesa (hábito + retorno D+1). */
export function recordFinanceiroMovementLocalDay(householdId: string, isoLocalDay: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_ENTRY_KEY(householdId), isoLocalDay);
}
