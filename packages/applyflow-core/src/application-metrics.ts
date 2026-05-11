import type { ApplyFlowApplication, ApplyFlowApplicationStatus } from "./application-types.js";
import { APPLYFLOW_APPLICATION_STATUS_LABELS_PT } from "./application-types.js";

const DAY_MS = 86_400_000;

export type ApplicationsPeriodFilter = "all" | "7d" | "30d" | "90d";

export type ApplicationMetrics = {
  total: number;
  byStatus: Record<string, number>;
  last7Days: number;
  last30Days: number;
  staleCount: number;
  interviewRate: number;
  technicalTestRate: number;
  acceptedRate: number;
  rejectedRate: number;
  averageFitScore?: number;
  skillsTop?: { skill: string; count: number }[];
  byRoleType: Record<string, number>;
  byWorkModel: Record<string, number>;
  byContractType: Record<string, number>;
  englishRequiredCount: number;
};

/** Estados que contagens como «paradas» quando sem actualização há 7+ dias. */
export const APPLICATION_STALE_STATUSES: ApplyFlowApplicationStatus[] = ["reviewing", "applied", "waiting_response"];

const ALL_STATUSES = Object.keys(APPLYFLOW_APPLICATION_STATUS_LABELS_PT) as ApplyFlowApplicationStatus[];

const ROLE_KEYS = ["frontend", "backend", "fullstack", "mobile", "data", "devops", "unknown"] as const;
const WORK_KEYS = ["remote", "hybrid", "onsite", "unknown"] as const;
const CONTRACT_KEYS = ["clt", "pj", "contractor", "internship", "unknown"] as const;

function emptyRoleType(): Record<string, number> {
  return Object.fromEntries(ROLE_KEYS.map((k) => [k, 0])) as Record<string, number>;
}
function emptyWorkModel(): Record<string, number> {
  return Object.fromEntries(WORK_KEYS.map((k) => [k, 0])) as Record<string, number>;
}
function emptyContract(): Record<string, number> {
  return Object.fromEntries(CONTRACT_KEYS.map((k) => [k, 0])) as Record<string, number>;
}

function parseIsoTime(iso?: string): number {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(t) ? t : NaN;
}

/** Início do período [cutoff, +∞) inclusivo em compare com createdAt. */
export function getPeriodCreatedAtFloor(period: ApplicationsPeriodFilter, now: Date): number | null {
  if (period === "all") return null;
  const n = now.getTime();
  if (period === "7d") return n - 7 * DAY_MS;
  if (period === "30d") return n - 30 * DAY_MS;
  return n - 90 * DAY_MS;
}

export function getApplicationsByPeriod(
  applications: ApplyFlowApplication[],
  period: ApplicationsPeriodFilter,
  now: Date = new Date(),
): ApplyFlowApplication[] {
  const floor = getPeriodCreatedAtFloor(period, now);
  if (floor == null) return applications;
  return applications.filter((a) => {
    const t = parseIsoTime(a.createdAt);
    return Number.isFinite(t) && t >= floor;
  });
}

export function isApplicationStale7d(app: ApplyFlowApplication, now: Date = new Date()): boolean {
  if (!APPLICATION_STALE_STATUSES.includes(app.status)) return false;
  const t = parseIsoTime(app.updatedAt);
  if (!Number.isFinite(t)) return false;
  return now.getTime() - t >= 7 * DAY_MS;
}

function emptyByStatus(): Record<string, number> {
  return ALL_STATUSES.reduce(
    (acc, s) => {
      acc[s] = 0;
      return acc;
    },
    {} as Record<string, number>,
  );
}

function bumpEnumCount(map: Record<string, number>, key: string | undefined, allowed: readonly string[]): void {
  const k = key && allowed.includes(key) ? key : "unknown";
  map[k] = (map[k] ?? 0) + 1;
}

/** Métricas derivadas da lista já filtrada (painel / período / estado). */
export function computeApplicationMetrics(applications: ApplyFlowApplication[], now: Date = new Date()): ApplicationMetrics {
  const byStatus = emptyByStatus();
  const nowMs = now.getTime();
  const floor7Created = nowMs - 7 * DAY_MS;
  const floor30Created = nowMs - 30 * DAY_MS;
  const floorStale = nowMs - 7 * DAY_MS;

  let staleCount = 0;
  const fitScores: number[] = [];

  const skillCounts = new Map<string, number>();
  const byRoleType = emptyRoleType();
  const byWorkModel = emptyWorkModel();
  const byContractType = emptyContract();
  let englishRequiredCount = 0;

  for (const a of applications) {
    byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;

    const u = parseIsoTime(a.updatedAt);
    if (APPLICATION_STALE_STATUSES.includes(a.status) && Number.isFinite(u) && u < floorStale) {
      staleCount += 1;
    }

    if (typeof a.fitScore === "number" && Number.isFinite(a.fitScore)) {
      fitScores.push(a.fitScore);
    }

    const jm = a.jobMeta;
    if (jm?.englishRequired === true) englishRequiredCount += 1;
    bumpEnumCount(byRoleType, jm?.roleType, [...ROLE_KEYS]);
    bumpEnumCount(byWorkModel, jm?.workModel, [...WORK_KEYS]);
    bumpEnumCount(byContractType, jm?.contractType, [...CONTRACT_KEYS]);

    for (const sk of jm?.detectedSkills ?? []) {
      if (!sk?.trim()) continue;
      const key = sk.trim();
      skillCounts.set(key, (skillCounts.get(key) ?? 0) + 1);
    }
  }

  let last7Days = 0;
  let last30Days = 0;
  for (const a of applications) {
    const c = parseIsoTime(a.createdAt);
    if (!Number.isFinite(c)) continue;
    if (c >= floor7Created) last7Days += 1;
    if (c >= floor30Created) last30Days += 1;
  }

  const total = applications.length;
  const safeRatio = (n: number) => (total > 0 ? n / total : 0);

  const interviewCount = applications.filter((x) => x.status === "interview").length;
  const techCount = applications.filter((x) => x.status === "technical_test").length;
  const acceptedCount = applications.filter((x) => x.status === "accepted").length;
  const rejectedCount = applications.filter((x) => x.status === "rejected").length;

  const averageFitScore =
    fitScores.length > 0 ? Math.round(fitScores.reduce((s, x) => s + x, 0) / fitScores.length) : undefined;

  const skillsTop = [...skillCounts.entries()]
    .sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))
    .slice(0, 12)
    .map(([skill, count]) => ({ skill, count }));

  return {
    total,
    byStatus,
    last7Days,
    last30Days,
    staleCount,
    interviewRate: safeRatio(interviewCount),
    technicalTestRate: safeRatio(techCount),
    acceptedRate: safeRatio(acceptedCount),
    rejectedRate: safeRatio(rejectedCount),
    averageFitScore,
    skillsTop: skillsTop.length ? skillsTop : undefined,
    byRoleType,
    byWorkModel,
    byContractType,
    englishRequiredCount,
  };
}
