import {
  applyFlowStoredJobSchema,
  CONTACT_STATUSES,
  coerceImportedApplicationStatus,
} from "@devflow/applyflow-core";
import { z } from "zod";

import { ApplyFlowMigrationServiceError } from "./migration-errors";

export const MIGRATION_SOURCE_VERSION = 1 as const;
export const MIGRATION_MAX_JOBS = 50;
export const MIGRATION_MAX_APPLICATIONS = 50;

const migrationJobSchema = applyFlowStoredJobSchema
  .omit({
    createdAt: true,
    updatedAt: true,
    descriptionHash: true,
  })
  .extend({
    id: z.string().trim().min(1).max(200),
    title: z.string().trim().min(1).max(200),
  })
  .strict();

const statusSchema = z.string().trim().min(1).transform((raw, ctx) => {
  const status = coerceImportedApplicationStatus(raw);
  if (!status) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "status inválido" });
    return z.NEVER;
  }
  return status;
});

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

const migrationApplicationSchema = z
  .object({
    id: z.string().trim().min(1).max(200),
    source: z.enum(["linkedin", "paste", "json"]),
    status: statusSchema,
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
  })
  .strict();

export const migrationImportBodySchema = z
  .object({
    sourceVersion: z.literal(MIGRATION_SOURCE_VERSION),
    fingerprint: z.string().trim().min(1).max(64),
    jobs: z.array(migrationJobSchema).max(MIGRATION_MAX_JOBS),
    applications: z.array(migrationApplicationSchema).max(MIGRATION_MAX_APPLICATIONS),
  })
  .strict();

export type MigrationImportBody = z.infer<typeof migrationImportBodySchema>;
export type MigrationJobInput = z.infer<typeof migrationJobSchema>;
export type MigrationApplicationInput = z.infer<typeof migrationApplicationSchema>;

export type MigrationCompletionProof = {
  sessionId: string;
  status: "completed";
  fingerprint: string;
  sourceVersion: typeof MIGRATION_SOURCE_VERSION;
  expectedJobs: number;
  expectedApplications: number;
  processedJobs: number;
  processedApplications: number;
  completedAt: string;
};

export type MigrationConflictResponse = {
  sessionId: string;
  status: "failed";
  fingerprint: string;
  conflicts: Array<{
    entityType: "job" | "application" | "bundle";
    entityId: string;
    reason: string;
  }>;
};

export function parseMigrationImportBody(raw: unknown): MigrationImportBody {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const jobs = (raw as { jobs?: unknown }).jobs;
    const applications = (raw as { applications?: unknown }).applications;
    if (Array.isArray(jobs) && jobs.length > MIGRATION_MAX_JOBS) {
      throw new ApplyFlowMigrationServiceError("payload_too_large");
    }
    if (Array.isArray(applications) && applications.length > MIGRATION_MAX_APPLICATIONS) {
      throw new ApplyFlowMigrationServiceError("payload_too_large");
    }
  }
  const parsed = migrationImportBodySchema.safeParse(raw);
  if (!parsed.success) {
    throw new ApplyFlowMigrationServiceError("invalid_migration_payload");
  }
  return parsed.data;
}
