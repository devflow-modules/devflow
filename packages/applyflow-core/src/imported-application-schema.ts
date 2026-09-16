import { z } from "zod";

import type { ApplyFlowApplication, ApplyFlowApplicationStatus, ApplyFlowJobMeta } from "./application-types.js";
import { coerceImportedApplicationStatus } from "./pipeline-status.js";

const statusSchema = z.string().min(1).transform((raw, ctx) => {
  const status = coerceImportedApplicationStatus(raw);
  if (!status) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "status inválido" });
    return z.NEVER;
  }
  return status;
});

const jobMetaSchema = z
  .object({
    seniority: z.string().optional(),
    roleType: z.string().optional(),
    workModel: z.string().optional(),
    contractType: z.string().optional(),
    englishRequired: z.boolean().optional(),
    detectedSkills: z.array(z.string()).optional(),
    salaryMentioned: z.boolean().optional(),
  })
  .partial()
  .passthrough();

const applicationRecordSchema = z
  .object({
    id: z.string().min(1),
    createdAt: z.string(),
    updatedAt: z.string(),
    source: z.literal("linkedin").optional(),
    jobTitle: z.string().optional(),
    companyName: z.string().optional(),
    jobUrl: z.string().optional(),
    status: statusSchema,
    fitScore: z.number().finite().optional(),
    fieldsDetected: z.number().int().nonnegative().optional(),
    fieldsFilled: z.number().int().nonnegative().optional(),
    blockedCount: z.number().int().nonnegative().optional(),
    failedCount: z.number().int().nonnegative().optional(),
    notes: z.string().optional(),
    jobMeta: jobMetaSchema.optional(),
    matchDecision: z.enum(["apply", "review", "needs_info", "skip"]).optional(),
    resumeTrack: z.string().max(64).optional(),
    strengthsSummary: z.array(z.string()).optional(),
    gapsSummary: z.array(z.string()).optional(),
    preparationStatus: z
      .object({
        total: z.number().int().nonnegative().optional(),
        ready: z.number().int().nonnegative().optional(),
        needsReview: z.number().int().nonnegative().optional(),
        missing: z.number().int().nonnegative().optional(),
        blocked: z.number().int().nonnegative().optional(),
      })
      .optional(),
  })
  .passthrough();

const versionedPayloadSchema = z.object({
  version: z.literal(1),
  applications: z.array(z.unknown()),
});

export type ParsedApplyFlowImportResult =
  | {
      ok: true;
      applications: ApplyFlowApplication[];
      ignoredCount: number;
    }
  | {
      ok: false;
      error: string;
      applications: [];
      ignoredCount: number;
    };

function normalizeJobMeta(raw: z.infer<typeof jobMetaSchema>): ApplyFlowJobMeta | undefined {
  const out: ApplyFlowJobMeta = {};
  if (raw.seniority?.trim()) out.seniority = raw.seniority.trim();
  if (raw.roleType?.trim()) out.roleType = raw.roleType.trim();
  if (raw.workModel?.trim()) out.workModel = raw.workModel.trim();
  if (raw.contractType?.trim()) out.contractType = raw.contractType.trim();
  if (typeof raw.englishRequired === "boolean") out.englishRequired = raw.englishRequired;
  if (typeof raw.salaryMentioned === "boolean") out.salaryMentioned = raw.salaryMentioned;
  if (Array.isArray(raw.detectedSkills) && raw.detectedSkills.length) {
    out.detectedSkills = [...new Set(raw.detectedSkills.map((s) => String(s).trim()).filter(Boolean))];
  }
  return Object.keys(out).length ? out : undefined;
}

function clipSummaryList(raw: unknown, maxItems = 8, maxLen = 48): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const t = item.trim().replace(/\s+/g, " ").slice(0, maxLen);
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
    if (out.length >= maxItems) break;
  }
  return out.length ? out : undefined;
}

function normalizeRecord(parsed: z.infer<typeof applicationRecordSchema>): ApplyFlowApplication {
  const jobMeta = parsed.jobMeta ? normalizeJobMeta(parsed.jobMeta) : undefined;
  const preparationStatus = parsed.preparationStatus
    ? {
        ...(typeof parsed.preparationStatus.total === "number" ? { total: parsed.preparationStatus.total } : {}),
        ...(typeof parsed.preparationStatus.ready === "number" ? { ready: parsed.preparationStatus.ready } : {}),
        ...(typeof parsed.preparationStatus.needsReview === "number"
          ? { needsReview: parsed.preparationStatus.needsReview }
          : {}),
        ...(typeof parsed.preparationStatus.missing === "number" ? { missing: parsed.preparationStatus.missing } : {}),
        ...(typeof parsed.preparationStatus.blocked === "number" ? { blocked: parsed.preparationStatus.blocked } : {}),
      }
    : undefined;
  return {
    id: parsed.id,
    createdAt: parsed.createdAt,
    updatedAt: parsed.updatedAt,
    source: parsed.source ?? "linkedin",
    jobTitle: parsed.jobTitle,
    companyName: parsed.companyName,
    jobUrl: parsed.jobUrl,
    status: parsed.status,
    fitScore: parsed.fitScore,
    fieldsDetected: parsed.fieldsDetected,
    fieldsFilled: parsed.fieldsFilled,
    blockedCount: parsed.blockedCount,
    failedCount: parsed.failedCount,
    notes: parsed.notes,
    jobMeta,
    matchDecision: parsed.matchDecision,
    resumeTrack: parsed.resumeTrack?.trim() || undefined,
    strengthsSummary: clipSummaryList(parsed.strengthsSummary),
    gapsSummary: clipSummaryList(parsed.gapsSummary),
    preparationStatus: preparationStatus && Object.keys(preparationStatus).length ? preparationStatus : undefined,
  };
}

function tryParseRecord(raw: unknown): ApplyFlowApplication | null {
  const r = applicationRecordSchema.safeParse(raw);
  if (!r.success) return null;
  return normalizeRecord(r.data);
}

/**
 * Extrai lista de candidaturas de JSON exportado pela extensão:
 * - array directo de registos
 * - ou `{ version: 1, applications: [...] }`
 */
export function parseApplyFlowApplicationsImport(raw: unknown): ParsedApplyFlowImportResult {
  let list: unknown[] | null = null;

  if (Array.isArray(raw)) {
    list = raw;
  } else if (raw !== null && typeof raw === "object") {
    const v = versionedPayloadSchema.safeParse(raw);
    if (v.success) list = v.data.applications;
  }

  if (list == null) {
    return {
      ok: false,
      error: 'Formato inválido: esperado um array de candidaturas ou { "version": 1, "applications": [...] }.',
      applications: [],
      ignoredCount: 0,
    };
  }

  const applications: ApplyFlowApplication[] = [];
  let ignoredCount = 0;
  for (const item of list) {
    const app = tryParseRecord(item);
    if (app) applications.push(app);
    else ignoredCount += 1;
  }

  if (applications.length === 0 && list.length > 0) {
    return {
      ok: false,
      error: "Nenhum registo válido encontrado — verifique campos obrigatórios (id, createdAt, updatedAt, status).",
      applications: [],
      ignoredCount,
    };
  }

  return { ok: true, applications, ignoredCount };
}

/** Parse a partir de texto JSON (string). */
export function parseApplyFlowImportJsonString(text: string): ParsedApplyFlowImportResult {
  let data: unknown;
  try {
    data = JSON.parse(text) as unknown;
  } catch {
    return {
      ok: false,
      error: "Ficheiro não é JSON válido.",
      applications: [],
      ignoredCount: 0,
    };
  }
  return parseApplyFlowApplicationsImport(data);
}
