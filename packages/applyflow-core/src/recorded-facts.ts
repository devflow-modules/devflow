import type { Evidence, EvidenceConfidence, EvidenceOrigin, EvidenceSource, EvidenceStance } from "./evidence-types.js";
import { EVIDENCE_KINDS, EVIDENCE_ORIGINS, EVIDENCE_STANCES, type EvidenceKind } from "./evidence-types.js";
import { normalizeEvidence, parseEvidence } from "./evidence-schema.js";

export const RECORDED_FACT_TOPICS = [
  "supabase.database",
  "supabase.auth",
  "supabase.storage",
  "supabase.edge_functions",
  "typescript.backend",
  "fullstack.period",
  "availability.window",
] as const;

export type RecordedFactTopic = (typeof RECORDED_FACT_TOPICS)[number];

export const SUPABASE_COMPONENT_TOPICS = [
  "supabase.database",
  "supabase.auth",
  "supabase.storage",
  "supabase.edge_functions",
] as const;

export type SupabaseComponentTopic = (typeof SUPABASE_COMPONENT_TOPICS)[number];

export const SUPABASE_COMPONENT_LABELS: Record<SupabaseComponentTopic, string> = {
  "supabase.database": "Supabase Database",
  "supabase.auth": "Supabase Auth",
  "supabase.storage": "Supabase Storage",
  "supabase.edge_functions": "Supabase Edge Functions",
};

const MONTH_INDEX = /^(\d{4})-(0[1-9]|1[0-2])$/;

export type RecordedFactInput = {
  id?: string;
  kind: EvidenceKind;
  topic: string;
  label: string;
  declaredValue?: string;
  description?: string;
  origin: EvidenceOrigin;
  sourceRef?: string;
  project?: string;
  company?: string;
  stance?: EvidenceStance;
  periodStart?: string;
  periodEnd?: string;
  scheduleWindow?: Evidence["scheduleWindow"];
  relatedJobId?: string;
  confirmedAt?: string;
  technologies?: string[];
};

export type MonthRange = {
  start: string;
  end: string;
};

export function isYearMonth(value: string | undefined): value is string {
  return typeof value === "string" && MONTH_INDEX.test(value);
}

export function monthIndex(value: string): number | undefined {
  const match = MONTH_INDEX.exec(value);
  if (!match) return undefined;
  return Number(match[1]) * 12 + (Number(match[2]) - 1);
}

export function yearMonthFromDate(now: Date): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function inclusiveMonthCount(start: string, end: string): number | undefined {
  const from = monthIndex(start);
  const to = monthIndex(end);
  if (from === undefined || to === undefined || to < from) return undefined;
  return to - from + 1;
}

/** Union of month ranges. Overlaps are counted once. Does not invent day precision. */
export function unionDocumentedMonths(ranges: readonly MonthRange[]): number | undefined {
  const normalized = ranges
    .map((range) => {
      const start = monthIndex(range.start);
      const end = monthIndex(range.end);
      if (start === undefined || end === undefined || end < start) return null;
      return { start, end };
    })
    .filter((item): item is { start: number; end: number } => item !== null)
    .sort((a, b) => a.start - b.start);
  if (normalized.length === 0) return undefined;
  const merged: { start: number; end: number }[] = [];
  for (const range of normalized) {
    const last = merged[merged.length - 1];
    if (!last || range.start > last.end + 1) {
      merged.push({ ...range });
      continue;
    }
    last.end = Math.max(last.end, range.end);
  }
  return merged.reduce((sum, range) => sum + (range.end - range.start + 1), 0);
}

export function documentedYearsFromMonths(months: number): number {
  return months / 12;
}

export function resolvePeriodEnd(end: string | undefined, now: Date): string | undefined {
  if (!end || end === "present") return yearMonthFromDate(now);
  return isYearMonth(end) ? end : undefined;
}

export function evidenceMonthRange(item: Evidence, now: Date = new Date()): MonthRange | undefined {
  if (!item.periodStart || !isYearMonth(item.periodStart)) return undefined;
  const end = resolvePeriodEnd(item.periodEnd, now);
  if (!end) return undefined;
  return { start: item.periodStart, end };
}

export function originToSource(origin: EvidenceOrigin): EvidenceSource {
  return origin === "document" ? "resume" : "candidate_input";
}

export function sourceToOrigin(source: EvidenceSource, explicit?: EvidenceOrigin): EvidenceOrigin {
  if (explicit) return explicit;
  return source === "resume" || source === "verified_profile" ? "document" : "candidate_declaration";
}

export function confidenceForRecordedFact(input: {
  origin: EvidenceOrigin;
  stance: EvidenceStance;
}): EvidenceConfidence {
  if (input.origin === "candidate_declaration") return "strong";
  if (input.stance === "absent") return "strong";
  return "strong";
}

function defaultDescription(input: RecordedFactInput): string {
  const stance = input.stance ?? "known";
  if (input.kind === "experience_period" && input.periodStart) {
    const end = input.periodEnd && input.periodEnd !== "present" ? input.periodEnd : "present";
    return `Documented ${input.label} from ${input.periodStart} to ${end}. Month precision only; day dates were not recorded.`;
  }
  if (input.kind === "availability" && input.scheduleWindow) {
    const scope = input.relatedJobId ? ` Scoped to job ${input.relatedJobId}.` : " General availability, not job-scoped.";
    const dst =
      input.scheduleWindow.dstPolicy === "ambiguous"
        ? " Daylight-saving policy stays ambiguous."
        : input.scheduleWindow.dstPolicy === "observes_dst"
          ? " Recorded as observing daylight saving."
          : " Recorded as standard time, without daylight-saving shift.";
    return `Availability ${input.declaredValue ?? "recorded"} for ${input.scheduleWindow.label}.${scope}${dst}`;
  }
  if (input.kind === "joint_skill") {
    return stance === "absent"
      ? `Candidate declared no joint ${input.label} experience.`
      : `Candidate declared direct participation using ${input.label}. Separate skills alone are not this fact.`;
  }
  if (stance === "absent") return `Candidate declared no recorded experience with ${input.label}.`;
  if (stance === "unknown") return `${input.label} remains unknown. No duration or claim was recorded.`;
  return `Candidate declared direct participation in ${input.label}. This is a declaration, not an independent audit.`;
}

export function buildRecordedFact(input: RecordedFactInput, now: Date = new Date()): Evidence {
  if (!EVIDENCE_KINDS.includes(input.kind)) {
    throw new Error("Tipo de fato adicional inválido.");
  }
  if (!EVIDENCE_ORIGINS.includes(input.origin)) {
    throw new Error("Origem do fato adicional inválida.");
  }
  const stance = input.stance ?? "known";
  if (!EVIDENCE_STANCES.includes(stance)) {
    throw new Error("Situação do fato adicional inválida.");
  }
  if (input.kind === "experience_period") {
    if (!isYearMonth(input.periodStart)) {
      throw new Error("Período documental precisa de início YYYY-MM, sem inventar o dia.");
    }
    if (input.periodEnd && input.periodEnd !== "present" && !isYearMonth(input.periodEnd)) {
      throw new Error("Fim do período precisa de YYYY-MM ou present.");
    }
  }
  if (input.kind === "availability" && !input.scheduleWindow?.label.trim()) {
    throw new Error("Disponibilidade precisa da faixa de horário informada.");
  }
  const stamp = now.toISOString();
  const origin = input.origin;
  const source = originToSource(origin);
  const usableForClaims = stance === "known";
  return normalizeEvidence({
    id: input.id?.trim() || `fact_${now.getTime().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    subject: input.kind === "availability" ? "experience" : input.kind === "experience_period" ? "experience" : "skill",
    label: input.label.trim(),
    description: (input.description ?? defaultDescription({ ...input, stance })).trim(),
    source,
    sourceRef: input.sourceRef,
    company: input.company,
    project: input.project,
    technologies: input.technologies,
    confidence: confidenceForRecordedFact({ origin, stance }),
    usableForClaims,
    createdAt: stamp,
    updatedAt: stamp,
    kind: input.kind,
    topic: input.topic.trim(),
    stance,
    origin,
    confirmedAt: input.confirmedAt ?? stamp,
    declaredValue: input.declaredValue,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    scheduleWindow: input.scheduleWindow,
    relatedJobId: input.relatedJobId,
  });
}

export function parseRecordedFacts(raw: unknown): { facts: Evidence[]; errors: string[] } {
  if (raw == null) return { facts: [], errors: [] };
  if (!Array.isArray(raw)) return { facts: [], errors: ["Evidências adicionais inválidas."] };
  const facts: Evidence[] = [];
  const errors: string[] = [];
  raw.forEach((item, index) => {
    const parsed = parseEvidence(item);
    if (parsed) {
      facts.push(parsed);
      return;
    }
    errors.push(`Fato adicional ${index + 1} é inválido.`);
  });
  return { facts, errors };
}

export function assertWritableRecordedFacts(raw: unknown): Evidence[] {
  const parsed = parseRecordedFacts(raw);
  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors[0] ?? "Fato adicional inválido. Nada foi gravado.");
  }
  return parsed.facts;
}

export function isJobScopedFact(item: Evidence, jobId: string | undefined): boolean {
  if (!item.relatedJobId) return true;
  return Boolean(jobId && item.relatedJobId === jobId);
}
