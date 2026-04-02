import { toDateOnly } from "@/lib/dates";

const SCORE_KEY = (householdId: string) => `financeiro_retention_score_${householdId}`;
const LAST_ENTRY_KEY = (householdId: string) => `financeiro_retention_last_entry_date_${householdId}`;

const returnBannerDismissedKey = (householdId: string, dayIso: string) =>
  `financeiro_return_banner_dismissed_${householdId}_${dayIso}`;

const dailyGoalTrackedKey = (householdId: string, dayIso: string) =>
  `financeiro_daily_goal_completed_tracked_${householdId}_${dayIso}`;

/** YYYY-MM-DD alinhado a `toDateOnly` (UTC), igual ao restante da retenção. */
export function calendarDayFromDate(d: Date): string {
  return toDateOnly(d);
}

function yesterdayCalendarIso(now: Date): string {
  const t = new Date(now.getTime());
  t.setUTCDate(t.getUTCDate() - 1);
  return toDateOnly(t);
}

/** Banner D+1: último movimento foi ontem e o utilizador não dispensou hoje. */
export function shouldShowReturnNextDayBanner(householdId: string, now: Date): boolean {
  if (typeof window === "undefined") return false;
  const today = calendarDayFromDate(now);
  if (localStorage.getItem(returnBannerDismissedKey(householdId, today))) return false;
  const last = readLastMovementDate(householdId);
  if (!last) return false;
  return last === yesterdayCalendarIso(now);
}

export function markReturnNextDayBannerShown(householdId: string, now: Date): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(returnBannerDismissedKey(householdId, calendarDayFromDate(now)), "1");
}

export function shouldTrackDailyGoalCompleted(householdId: string, now: Date): boolean {
  if (typeof window === "undefined") return false;
  return !localStorage.getItem(dailyGoalTrackedKey(householdId, calendarDayFromDate(now)));
}

export function markDailyGoalCompletedTracked(householdId: string, now: Date): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(dailyGoalTrackedKey(householdId, calendarDayFromDate(now)), "1");
}

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
