import { z } from "zod";

import type { ApplyFlowApplicationStatus } from "./application-types.js";
import { ingestApplyFlowJob } from "./ingest-applyflow-job.js";
import { JOB_DESCRIPTION_SNAPSHOT_MAX_CHARS } from "./job-description-snapshot.js";
import {
  APPLICATION_PACK_CHECKLIST_IDS,
  APPLICATION_PACK_SCHEMA_VERSION,
  APPLICATION_PACK_VERSION,
} from "./application-pack-types.js";
import {
  APPLYFLOW_JOB_SOURCES,
  CURRICULUM_ROUTER_CONFIDENCE,
  CURRICULUM_ROUTER_VERSION,
  JOB_MATCH_DECISIONS,
  JOB_MATCH_SCORING_VERSION,
  type ApplyFlowJob,
  type ApplyFlowJobSource,
} from "./job-match-types.js";
import type { CandidateProfile } from "./profile-schema.js";
import type { ResumeLibrary } from "./resume-library-types.js";

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

const jobMatchSchema = z.object({
  score: z.number().finite().min(0).max(100),
  decision: z.enum(JOB_MATCH_DECISIONS),
  matchedSkills: z.array(z.string()),
  missingSkills: z.array(z.string()),
  evaluatedAt: z.string().min(1),
  scoringVersion: z.literal(JOB_MATCH_SCORING_VERSION),
});

const resumeMatchCandidateSchema = z.object({
  variantId: z.string().min(1).max(80),
  variantName: z.string().min(1).max(80),
  score: z.number().finite().min(0).max(100),
  decision: z.enum(JOB_MATCH_DECISIONS),
  matchedSkills: z.array(z.string()),
  missingSkills: z.array(z.string()),
});

const curriculumRecommendationSchema = z.object({
  recommendedVariantId: z.string().min(1).max(80),
  recommendedVariantName: z.string().min(1).max(80),
  evaluatedAt: z.string().min(1),
  scoringVersion: z.literal(JOB_MATCH_SCORING_VERSION),
  routerVersion: z.literal(CURRICULUM_ROUTER_VERSION),
  confidence: z.enum(CURRICULUM_ROUTER_CONFIDENCE),
  scoreDelta: z.number().int().min(0).max(100),
  runnerUpVariantId: z.string().min(1).max(80).optional(),
  runnerUpVariantName: z.string().min(1).max(80).optional(),
  candidates: z.array(resumeMatchCandidateSchema).min(2),
});

const evaluatedWithSchema = z.object({
  variantId: z.string().min(1).max(80),
  variantName: z.string().min(1).max(80),
});

const applicationPackSchema = z.object({
  version: z.literal(APPLICATION_PACK_SCHEMA_VERSION),
  packVersion: z.literal(APPLICATION_PACK_VERSION),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  jobId: z.string().min(1),
  resume: z.object({
    variantId: z.string().min(1).max(80),
    variantName: z.string().min(1).max(80),
    recommendedByRouter: z.boolean(),
  }),
  match: z.object({
    score: z.number().finite().min(0).max(100),
    decision: z.enum(JOB_MATCH_DECISIONS),
    matchedSkills: z.array(z.string()),
    missingSkills: z.array(z.string()),
    scoringVersion: z.literal(JOB_MATCH_SCORING_VERSION),
  }),
  highlights: z.array(z.string()),
  gaps: z.array(z.string()),
  candidateFacts: z.object({
    name: z.string().optional(),
    location: z.string().optional(),
    englishLevel: z.enum(["Basic", "Intermediate", "Advanced", "Fluent"]).optional(),
    comfortableInEnglish: z.boolean().optional(),
    roles: z.array(z.string()).optional(),
    salary: z
      .object({
        cltPleno: z.string().optional(),
        cltSenior: z.string().optional(),
        pjSenior: z.string().optional(),
        usdMonthly: z.string().optional(),
        usdHourly: z.string().optional(),
      })
      .optional(),
    answerBank: z
      .object({
        professionalSummary: z.string().optional(),
        tellUsAboutYourself: z.string().optional(),
        whyGoodFit: z.string().optional(),
        availability: z.string().optional(),
      })
      .optional(),
  }),
  checklist: z.array(
    z.object({
      id: z.enum(APPLICATION_PACK_CHECKLIST_IDS),
      done: z.boolean(),
    }),
  ),
});

const jobRecordSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200),
  company: z.string().max(200).optional(),
  location: z.string().max(200).optional(),
  url: z.string().max(500).optional(),
  source: z.enum(APPLYFLOW_JOB_SOURCES),
  status: z.enum(STATUS_VALUES),
  jobContext: z.object({
    seniority: z.string().optional(),
    employmentType: z.string().optional(),
    workModel: z.string().optional(),
    skills: z.array(z.string()),
  }),
  descriptionSnapshot: z.string().max(JOB_DESCRIPTION_SNAPSHOT_MAX_CHARS).optional(),
  descriptionHash: z.string().max(32).optional(),
  jobMatch: jobMatchSchema,
  evaluatedWith: evaluatedWithSchema.optional(),
  curriculumRecommendation: curriculumRecommendationSchema.optional(),
  applicationPack: applicationPackSchema.optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

const listingSchema = z.object({
  description: z.string().min(1),
  title: z.string().max(200).optional(),
  company: z.string().max(200).optional(),
  location: z.string().max(200).optional(),
  url: z.string().max(500).optional(),
  source: z.enum(["paste", "json"]).optional(),
});

const version2Schema = z.object({
  version: z.literal(2),
  jobs: z.array(z.unknown()).optional(),
  listings: z.array(z.unknown()).optional(),
});

export type ParsedApplyFlowJobsImportResult =
  | {
      ok: true;
      jobs: ApplyFlowJob[];
      ignoredCount: number;
    }
  | {
      ok: false;
      error: string;
      jobs: [];
      ignoredCount: number;
    };

export type IngestJobsImportOptions = {
  profile: CandidateProfile;
  resumeLibrary?: ResumeLibrary;
  now?: Date;
};

function optionalTrim(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeStoredJob(parsed: z.infer<typeof jobRecordSchema>): ApplyFlowJob {
  return {
    id: parsed.id,
    title: parsed.title.trim(),
    company: optionalTrim(parsed.company),
    location: optionalTrim(parsed.location),
    url: optionalTrim(parsed.url),
    source: parsed.source,
    status: parsed.status,
    jobContext: {
      seniority: optionalTrim(parsed.jobContext.seniority),
      employmentType: optionalTrim(parsed.jobContext.employmentType),
      workModel: optionalTrim(parsed.jobContext.workModel),
      skills: parsed.jobContext.skills.map((s) => s.trim()).filter(Boolean),
    },
    descriptionSnapshot: optionalTrim(parsed.descriptionSnapshot),
    descriptionHash: optionalTrim(parsed.descriptionHash),
    jobMatch: parsed.jobMatch,
    ...(parsed.evaluatedWith
      ? {
          evaluatedWith: {
            variantId: parsed.evaluatedWith.variantId,
            variantName: parsed.evaluatedWith.variantName,
          },
        }
      : {}),
    ...(parsed.curriculumRecommendation
      ? { curriculumRecommendation: parsed.curriculumRecommendation }
      : {}),
    ...(parsed.applicationPack ? { applicationPack: parsed.applicationPack } : {}),
    createdAt: parsed.createdAt,
    updatedAt: parsed.updatedAt,
  };
}

function ingestListing(
  raw: unknown,
  options: IngestJobsImportOptions,
  index: number,
): ApplyFlowJob | null {
  const parsed = listingSchema.safeParse(raw);
  if (!parsed.success) return null;
  const source: ApplyFlowJobSource = parsed.data.source ?? "json";
  return ingestApplyFlowJob({
    description: parsed.data.description,
    source,
    title: parsed.data.title,
    company: parsed.data.company,
    location: parsed.data.location,
    url: parsed.data.url,
    profile: options.profile,
    resumeLibrary: options.resumeLibrary,
    now: options.now,
    id: `job_import_${index}_${(options.now ?? new Date()).getTime().toString(36)}`,
  });
}

/**
 * Import v2: `{ version: 2, jobs: ApplyFlowJob[] }` (roundtrip, no silent rescore)
 * or `{ version: 2, listings: [{ description, ... }] }` (normalize + match).
 */
export function parseApplyFlowJobsImport(
  raw: unknown,
  options: IngestJobsImportOptions,
): ParsedApplyFlowJobsImportResult {
  const envelope = version2Schema.safeParse(raw);
  if (!envelope.success) {
    return {
      ok: false,
      error: 'Formato inválido: esperado { "version": 2, "jobs": [...] } ou { "version": 2, "listings": [...] }.',
      jobs: [],
      ignoredCount: 0,
    };
  }

  const hasJobs = Array.isArray(envelope.data.jobs);
  const hasListings = Array.isArray(envelope.data.listings);
  if (!hasJobs && !hasListings) {
    return {
      ok: false,
      error: 'Import v2 precisa de "jobs" ou "listings".',
      jobs: [],
      ignoredCount: 0,
    };
  }

  const jobs: ApplyFlowJob[] = [];
  let ignoredCount = 0;

  if (hasJobs) {
    for (const item of envelope.data.jobs ?? []) {
      const parsed = jobRecordSchema.safeParse(item);
      if (parsed.success) jobs.push(normalizeStoredJob(parsed.data));
      else ignoredCount += 1;
    }
  } else {
    (envelope.data.listings ?? []).forEach((item, index) => {
      const job = ingestListing(item, options, index);
      if (job) jobs.push(job);
      else ignoredCount += 1;
    });
  }

  if (jobs.length === 0) {
    return {
      ok: false,
      error: "Nenhuma vaga válida encontrada no import v2.",
      jobs: [],
      ignoredCount,
    };
  }

  return { ok: true, jobs, ignoredCount };
}

export function parseApplyFlowJobsImportJsonString(
  text: string,
  options: IngestJobsImportOptions,
): ParsedApplyFlowJobsImportResult {
  let data: unknown;
  try {
    data = JSON.parse(text) as unknown;
  } catch {
    return {
      ok: false,
      error: "Ficheiro não é JSON válido.",
      jobs: [],
      ignoredCount: 0,
    };
  }
  return parseApplyFlowJobsImport(data, options);
}

export function isApplyFlowJobsImportV2(raw: unknown): boolean {
  return version2Schema.safeParse(raw).success;
}
