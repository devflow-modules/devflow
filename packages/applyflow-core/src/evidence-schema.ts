import { z } from "zod";

import {
  EVIDENCE_CONFIDENCE,
  EVIDENCE_DST_POLICIES,
  EVIDENCE_KINDS,
  EVIDENCE_ORIGINS,
  EVIDENCE_SOURCES,
  EVIDENCE_STANCES,
  EVIDENCE_SUBJECTS,
  type Evidence,
  type EvidenceLibrary,
} from "./evidence-types.js";

const yearMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use YYYY-MM without inventing a day.");

const evidenceRecordSchema = z.object({
  id: z.string().trim().min(1).max(80),
  subject: z.enum(EVIDENCE_SUBJECTS),
  label: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(2000),
  source: z.enum(EVIDENCE_SOURCES),
  sourceRef: z.string().trim().max(400).optional(),
  company: z.string().trim().max(200).optional(),
  project: z.string().trim().max(200).optional(),
  technologies: z.array(z.string().trim().max(80)).max(32).optional(),
  confidence: z.enum(EVIDENCE_CONFIDENCE),
  usableForClaims: z.boolean(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  kind: z.enum(EVIDENCE_KINDS).optional(),
  topic: z.string().trim().max(80).optional(),
  stance: z.enum(EVIDENCE_STANCES).optional(),
  origin: z.enum(EVIDENCE_ORIGINS).optional(),
  confirmedAt: z.string().min(1).max(40).optional(),
  declaredValue: z.string().trim().max(200).optional(),
  periodStart: yearMonth.optional(),
  periodEnd: z.union([yearMonth, z.literal("present")]).optional(),
  scheduleWindow: z
    .object({
      label: z.string().trim().min(1).max(200),
      timezoneLabel: z.string().trim().max(40).optional(),
      dstPolicy: z.enum(EVIDENCE_DST_POLICIES).optional(),
    })
    .optional(),
  relatedJobId: z.string().trim().max(80).optional(),
});

function optionalTrim(value: string | undefined, max: number): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

export function normalizeEvidence(parsed: z.infer<typeof evidenceRecordSchema>): Evidence {
  const technologies = parsed.technologies
    ?.map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 32);
  const origin =
    parsed.origin ??
    (parsed.source === "resume" || parsed.source === "verified_profile" ? "document" : "candidate_declaration");
  const confidence =
    origin === "candidate_declaration" && parsed.confidence === "verified" ? "strong" : parsed.confidence;
  const scheduleWindow = parsed.scheduleWindow
    ? {
        label: parsed.scheduleWindow.label.trim(),
        ...(parsed.scheduleWindow.timezoneLabel
          ? { timezoneLabel: parsed.scheduleWindow.timezoneLabel.trim() }
          : {}),
        ...(parsed.scheduleWindow.dstPolicy ? { dstPolicy: parsed.scheduleWindow.dstPolicy } : {}),
      }
    : undefined;
  return {
    id: parsed.id.trim(),
    subject: parsed.subject,
    label: parsed.label.trim(),
    description: parsed.description.trim(),
    source: parsed.source,
    sourceRef: optionalTrim(parsed.sourceRef, 400),
    company: optionalTrim(parsed.company, 200),
    project: optionalTrim(parsed.project, 200),
    ...(technologies && technologies.length > 0 ? { technologies } : {}),
    confidence,
    usableForClaims: parsed.usableForClaims,
    createdAt: parsed.createdAt,
    updatedAt: parsed.updatedAt,
    ...(parsed.kind ? { kind: parsed.kind } : {}),
    ...(optionalTrim(parsed.topic, 80) ? { topic: optionalTrim(parsed.topic, 80) } : {}),
    ...(parsed.stance ? { stance: parsed.stance } : {}),
    origin,
    ...(optionalTrim(parsed.confirmedAt, 40) ? { confirmedAt: optionalTrim(parsed.confirmedAt, 40) } : {}),
    ...(optionalTrim(parsed.declaredValue, 200) ? { declaredValue: optionalTrim(parsed.declaredValue, 200) } : {}),
    ...(parsed.periodStart ? { periodStart: parsed.periodStart } : {}),
    ...(parsed.periodEnd ? { periodEnd: parsed.periodEnd } : {}),
    ...(scheduleWindow ? { scheduleWindow } : {}),
    ...(optionalTrim(parsed.relatedJobId, 80) ? { relatedJobId: optionalTrim(parsed.relatedJobId, 80) } : {}),
  };
}

export function parseEvidence(raw: unknown): Evidence | null {
  const parsed = evidenceRecordSchema.safeParse(raw);
  if (!parsed.success) return null;
  return normalizeEvidence(parsed.data);
}

export function parseEvidenceLibrary(raw: unknown): { ok: true; library: EvidenceLibrary } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Evidence library inválida." };
  }
  const doc = raw as { version?: unknown; evidence?: unknown };
  if (doc.version !== 1 || !Array.isArray(doc.evidence)) {
    return { ok: false, error: 'Esperado { "version": 1, "evidence": [...] }.' };
  }
  const evidence: Evidence[] = [];
  for (const item of doc.evidence) {
    const parsed = parseEvidence(item);
    if (parsed) evidence.push(parsed);
  }
  return { ok: true, library: { version: 1, evidence } };
}

export function mergeEvidenceLibraries(...lists: readonly Evidence[][]): Evidence[] {
  const seen = new Set<string>();
  const out: Evidence[] = [];
  for (const list of lists) {
    for (const item of list) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      out.push(item);
    }
  }
  return out;
}
