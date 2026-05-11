import type { ApplyFlowApplication, ApplyFlowApplicationStatus } from "./application-types.js";
import {
  type ApplicationsPeriodFilter,
  getApplicationsByPeriod,
  isApplicationStale7d,
} from "./application-metrics.js";
import type { DashboardTableFilters } from "./dashboard-types.js";

function parseIso(iso?: string): number {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(t) ? t : NaN;
}

export function filterApplicationsByStatus(
  apps: ApplyFlowApplication[],
  status: ApplyFlowApplicationStatus | "all",
): ApplyFlowApplication[] {
  if (status === "all") return apps;
  return apps.filter((a) => a.status === status);
}

export function filterApplicationsByPeriod(
  apps: ApplyFlowApplication[],
  period: ApplicationsPeriodFilter,
  now: Date = new Date(),
): ApplyFlowApplication[] {
  return getApplicationsByPeriod(apps, period, now);
}

export function filterApplicationsBySkill(apps: ApplyFlowApplication[], skill: string): ApplyFlowApplication[] {
  const s = skill.trim().toLowerCase();
  if (!s) return apps;
  return apps.filter((a) =>
    (a.jobMeta?.detectedSkills ?? []).some((k) => k.toLowerCase().includes(s) || s.includes(k.toLowerCase())),
  );
}

export function filterApplicationsByWorkModel(apps: ApplyFlowApplication[], workModel: string): ApplyFlowApplication[] {
  const w = workModel.trim().toLowerCase();
  if (!w || w === "all") return apps;
  return apps.filter((a) => (a.jobMeta?.workModel ?? "unknown").toLowerCase() === w);
}

export function filterApplicationsByContract(apps: ApplyFlowApplication[], contractType: string): ApplyFlowApplication[] {
  const c = contractType.trim().toLowerCase();
  if (!c || c === "all") return apps;
  return apps.filter((a) => (a.jobMeta?.contractType ?? "unknown").toLowerCase() === c);
}

export function filterApplicationsByEnglishRequired(
  apps: ApplyFlowApplication[],
  mode: "all" | "yes" | "no",
): ApplyFlowApplication[] {
  if (mode === "all") return apps;
  if (mode === "yes") return apps.filter((a) => a.jobMeta?.englishRequired === true);
  return apps.filter((a) => a.jobMeta?.englishRequired !== true);
}

/** Aplica todos os filtros de tabela na ordem: período → status → skill → modelo → contrato → inglês. */
export function applyDashboardTableFilters(
  apps: ApplyFlowApplication[],
  filters: DashboardTableFilters,
  now: Date = new Date(),
): ApplyFlowApplication[] {
  let out = filterApplicationsByPeriod(apps, filters.period, now);
  out = filterApplicationsByStatus(out, filters.status);
  out = filterApplicationsBySkill(out, filters.skill);
  out = filterApplicationsByWorkModel(out, filters.workModel);
  out = filterApplicationsByContract(out, filters.contractType);
  out = filterApplicationsByEnglishRequired(out, filters.englishRequired);
  return out;
}

export function countStaleApplications(apps: ApplyFlowApplication[], now: Date = new Date()): number {
  return apps.filter((a) => isApplicationStale7d(a, now)).length;
}

/** Agrupa candidaturas por semana (ISO week approximation: bucket por segunda do calendário). */
export function bucketApplicationsByWeek(
  apps: ApplyFlowApplication[],
): { key: string; label: string; count: number }[] {
  const map = new Map<string, number>();
  for (const a of apps) {
    const t = parseIso(a.createdAt);
    if (!Number.isFinite(t)) continue;
    const d = new Date(t);
    const day = d.getUTCDay();
    const diff = (day + 6) % 7;
    d.setUTCDate(d.getUTCDate() - diff);
    d.setUTCHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .sort((x, y) => x[0].localeCompare(y[0]))
    .map(([key, count]) => ({ key, label: key, count }));
}

/** Funil ordenado por fluxo típico (para gráfico). */
export const FUNNEL_STATUS_ORDER: ApplyFlowApplicationStatus[] = [
  "reviewing",
  "applied",
  "waiting_response",
  "interview",
  "technical_test",
  "accepted",
  "rejected",
  "ignored",
];

export function computeCreatedAtRange(apps: ApplyFlowApplication[]): { oldest?: string; newest?: string } {
  let minT = Infinity;
  let maxT = -Infinity;
  for (const a of apps) {
    const t = Date.parse(a.createdAt);
    if (!Number.isFinite(t)) continue;
    minT = Math.min(minT, t);
    maxT = Math.max(maxT, t);
  }
  if (!Number.isFinite(minT) || !Number.isFinite(maxT)) return {};
  return { oldest: new Date(minT).toISOString(), newest: new Date(maxT).toISOString() };
}

/** Lista deduplicada de skills presentes nos registos (para selects). */
export function collectDetectedSkills(apps: ApplyFlowApplication[]): string[] {
  const set = new Set<string>();
  for (const a of apps) {
    for (const s of a.jobMeta?.detectedSkills ?? []) {
      const t = s.trim();
      if (t) set.add(t);
    }
  }
  return [...set].sort((x, y) => x.localeCompare(y));
}
