import type { Prisma } from "@prisma/client";

export type FollowupUrgency = "overdue" | "due_today" | "upcoming" | "none";

/** Início do dia civil local (servidor) para o instante d. */
export function startOfLocalDay(d: Date = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

/** Fim do dia (exclusivo): 00:00 do dia seguinte, local. */
export function endOfLocalDay(d: Date = new Date()): Date {
  const s = startOfLocalDay(d);
  const e = new Date(s);
  e.setDate(e.getDate() + 1);
  return e;
}

/**
 * Urgência derivada do próximo follow-up.
 * - overdue: antes de hoje 00:00
 * - due_today: hoje 00:00 – &lt; amanhã 00:00
 * - upcoming: depois de hoje
 * - none: sem data
 */
export function deriveFollowupUrgency(
  nextFollowUpAtIso: string | null | undefined,
  now: Date = new Date()
): FollowupUrgency {
  if (!nextFollowUpAtIso) return "none";
  const t = new Date(nextFollowUpAtIso);
  if (Number.isNaN(t.getTime())) return "none";
  const start = startOfLocalDay(now);
  const end = endOfLocalDay(now);
  if (t < start) return "overdue";
  if (t < end) return "due_today";
  return "upcoming";
}

const MID_STAGES = new Set(["contato_iniciado", "respondeu", "qualificado", "demo_enviada", "negociacao", "reuniao"]);

const STALE_DAYS = 7;

/**
 * Aviso “sem contato recente”: em estágios de meio de funil e (sem lastContact
 * ou &gt; 7 dias).
 */
export function isStaleContact(
  status: string,
  lastContactAtIso: string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!MID_STAGES.has(status)) return false;
  if (!lastContactAtIso) return true;
  const t = new Date(lastContactAtIso);
  if (Number.isNaN(t.getTime())) return true;
  const diffMs = now.getTime() - t.getTime();
  return diffMs > STALE_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * Filtro Prisma para `followup=overdue|today|none` (parâmetro GET `followup`).
 * `overdue`: follow-up perdeu o dia (antes de hoje 00:00).
 * `today`: com follow-up hoje
 * `none`: sem `nextFollowUpAt`
 */
export function buildPrismaWhereForFollowupFilter(
  follow: "overdue" | "today" | "none",
  now: Date = new Date()
): Prisma.LeadWhereInput {
  if (follow === "none") {
    return { nextFollowUpAt: null };
  }
  const start = startOfLocalDay(now);
  const end = endOfLocalDay(now);
  if (follow === "overdue") {
    return {
      nextFollowUpAt: { not: null, lt: start },
    };
  }
  return {
    nextFollowUpAt: { gte: start, lt: end },
  };
}

export function addLocalDaysWithHour(base: Date, days: number, hour: number, minute: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
}
