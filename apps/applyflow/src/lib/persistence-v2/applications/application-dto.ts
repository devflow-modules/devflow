import {
  CONTACT_STATUSES,
  coerceImportedApplicationStatus,
  type ApplyFlowApplicationStatus,
} from "@devflow/applyflow-core";
import { z } from "zod";

import { parseJobIfMatch, jobVersionEtag } from "../jobs/job-dto";
import { ApplyFlowApplicationServiceError } from "./application-errors";

const statusSchema = z.string().trim().min(1).transform((raw, ctx) => {
  const status = coerceImportedApplicationStatus(raw);
  if (!status) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "status inválido" });
    return z.NEVER;
  }
  return status;
});

const sourceSchema = z.enum(["linkedin", "paste", "json"]);

const jobMetaSchema = z
  .object({
    seniority: z.string().trim().min(1).max(80).optional(),
    roleType: z.string().trim().min(1).max(80).optional(),
    workModel: z.string().trim().min(1).max(80).optional(),
    contractType: z.string().trim().min(1).max(80).optional(),
    englishRequired: z.boolean().optional(),
    detectedSkills: z.array(z.string().trim().min(1).max(48)).max(40).optional(),
    salaryMentioned: z.boolean().optional(),
  })
  .strict();

const preparationStatusSchema = z
  .object({
    total: z.number().int().nonnegative().optional(),
    ready: z.number().int().nonnegative().optional(),
    needsReview: z.number().int().nonnegative().optional(),
    missing: z.number().int().nonnegative().optional(),
    blocked: z.number().int().nonnegative().optional(),
  })
  .strict();

const extrasSchema = z
  .object({
    fieldsDetected: z.number().int().nonnegative().optional(),
    fieldsFilled: z.number().int().nonnegative().optional(),
    blockedCount: z.number().int().nonnegative().optional(),
    failedCount: z.number().int().nonnegative().optional(),
    matchDecision: z.enum(["apply", "review", "needs_info", "skip"]).optional(),
    resumeTrack: z.string().trim().min(1).max(64).optional(),
    strengthsSummary: z.array(z.string().trim().min(1).max(48)).max(8).optional(),
    gapsSummary: z.array(z.string().trim().min(1).max(48)).max(8).optional(),
    preparationStatus: preparationStatusSchema.optional(),
  })
  .strict();

const v2MetaSchema = z
  .object({
    decision: z.enum(["apply_high", "apply_normal", "apply_stretch", "needs_info", "skip"]).optional(),
    priority: z.number().finite().optional(),
    hiringProbability: z.enum(["low", "medium", "high"]).optional(),
    careerUpside: z.enum(["low", "medium", "high", "very_high"]).optional(),
    eliminationRisk: z.enum(["low", "medium", "high"]).optional(),
    resumeVariant: z.string().trim().min(1).max(80).optional(),
    networkingStatus: z.enum(CONTACT_STATUSES).optional(),
    nextActionAt: z.string().datetime().optional(),
  })
  .strict();

const applicationFields = {
  source: sourceSchema.optional(),
  status: statusSchema.optional(),
  sourceJobId: z.string().trim().min(1).max(200).nullable().optional(),
  jobTitle: z.string().trim().max(240).nullable().optional(),
  companyName: z.string().trim().max(240).nullable().optional(),
  jobUrl: z.string().trim().max(500).nullable().optional(),
  fitScore: z.number().finite().nullable().optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
  jobMeta: jobMetaSchema.nullable().optional(),
  v2Meta: v2MetaSchema.nullable().optional(),
  extras: extrasSchema.nullable().optional(),
  appliedAt: z.string().datetime().nullable().optional(),
};

export const createApplicationBodySchema = z
  .object({
    id: z.string().trim().min(1).max(200).optional(),
    ...applicationFields,
  })
  .strict();

export const patchApplicationBodySchema = z.object(applicationFields).strict();

export type CreateApplicationBody = z.infer<typeof createApplicationBodySchema>;
export type PatchApplicationBody = z.infer<typeof patchApplicationBodySchema>;

export type ApplicationResponse = {
  id: string;
  sourceJobId: string | null;
  source: "linkedin" | "paste" | "json";
  status: ApplyFlowApplicationStatus;
  jobTitle: string | null;
  companyName: string | null;
  jobUrl: string | null;
  fitScore: number | null;
  notes: string | null;
  jobMeta: z.infer<typeof jobMetaSchema> | null;
  v2Meta: z.infer<typeof v2MetaSchema> | null;
  extras: z.infer<typeof extrasSchema> | null;
  appliedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export function parseCreateApplicationBody(raw: unknown): CreateApplicationBody {
  const parsed = createApplicationBodySchema.safeParse(raw);
  if (!parsed.success) throw new ApplyFlowApplicationServiceError("invalid_payload");
  return parsed.data;
}

export function parsePatchApplicationBody(raw: unknown): PatchApplicationBody {
  const parsed = patchApplicationBodySchema.safeParse(raw);
  if (!parsed.success) throw new ApplyFlowApplicationServiceError("invalid_payload");
  if (Object.keys(parsed.data).length === 0) {
    throw new ApplyFlowApplicationServiceError("empty_patch");
  }
  return parsed.data;
}

export function parseApplicationIfMatch(header: string | null): number {
  try {
    return parseJobIfMatch(header);
  } catch {
    throw new ApplyFlowApplicationServiceError("invalid_if_match");
  }
}

export function applicationVersionEtag(version: number): string {
  return jobVersionEtag(version);
}
