import { z } from "zod";

import type { ApplyFlowApplication, ApplyFlowApplicationStatus, ApplyFlowJobMeta } from "./application-types.js";

const STATUS_VALUES = [
  "reviewing",
  "applied",
  "ignored",
  "waiting_response",
  "interview",
  "technical_test",
  "rejected",
  "accepted",
] as const satisfies readonly ApplyFlowApplicationStatus[];

const statusSchema = z.enum(STATUS_VALUES);

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

function normalizeRecord(parsed: z.infer<typeof applicationRecordSchema>): ApplyFlowApplication {
  const jobMeta = parsed.jobMeta ? normalizeJobMeta(parsed.jobMeta) : undefined;
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
