import type { ApplyFlowApplicationStatus, ApplyFlowJob } from "@devflow/applyflow-core";
import {
  canonicalizeJobUrl,
  hashJobDescription,
} from "@devflow/applyflow-core";
import { Prisma } from "@prisma/client";

import {
  applyFlowApplicationRepository,
  applyFlowJobRepository,
  applyFlowMigrationSessionRepository,
  type ApplyFlowApplicationCreateInput,
  type ApplyFlowApplicationRepository,
  type ApplyFlowJobCreateInput,
  type ApplyFlowJobRepository,
  type ApplyFlowMigrationSession,
  type ApplyFlowMigrationSessionRepository,
} from "../repositories";
import {
  canonicalizeForFingerprint,
  fingerprintMigrationBundle,
  type MigrationApplicationFingerprintInput,
  type MigrationJobFingerprintInput,
} from "./migration-fingerprint";
import type {
  MigrationApplicationInput,
  MigrationCompletionProof,
  MigrationConflictResponse,
  MigrationImportBody,
  MigrationJobInput,
} from "./migration-dto";
import {
  ApplyFlowMigrationServiceError,
  type MigrationConflict,
} from "./migration-errors";

export const MIGRATION_SESSION_STATUS = {
  pending: "pending",
  importing: "importing",
  completed: "completed",
  failed: "failed",
} as const;

const POST_APPLY_STATUSES = new Set<ApplyFlowApplicationStatus>([
  "applied",
  "waiting_response",
  "interview",
  "technical_test",
  "rejected",
  "accepted",
  "hired",
]);

function optionalText(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function jsonOrNull(value: unknown): Prisma.InputJsonValue | null {
  if (value == null) return null;
  return asJson(value);
}

function normalizeContext(context: ApplyFlowJob["jobContext"]): Prisma.InputJsonValue {
  return {
    skills: context.skills.map((skill) => skill.trim()).filter(Boolean),
    ...(optionalText(context.seniority) ? { seniority: optionalText(context.seniority) } : {}),
    ...(optionalText(context.employmentType)
      ? { employmentType: optionalText(context.employmentType) }
      : {}),
    ...(optionalText(context.workModel) ? { workModel: optionalText(context.workModel) } : {}),
  };
}

function derivedFromUrl(url: string | null | undefined): {
  url: string | null;
  canonicalUrl: string | null;
} {
  const normalized = optionalText(url);
  if (!normalized) return { url: null, canonicalUrl: null };
  return {
    url: normalized,
    canonicalUrl: canonicalizeJobUrl(normalized) ?? null,
  };
}

function derivedFromSnapshot(snapshot: string | null | undefined): {
  descriptionSnapshot: string | null;
  descriptionHash: string | null;
} {
  const normalized = optionalText(snapshot);
  if (!normalized) return { descriptionSnapshot: null, descriptionHash: null };
  return {
    descriptionSnapshot: normalized,
    descriptionHash: hashJobDescription(normalized),
  };
}

function toJobCreateInput(accountId: string, job: MigrationJobInput): ApplyFlowJobCreateInput {
  const url = derivedFromUrl(job.url);
  const description = derivedFromSnapshot(job.descriptionSnapshot);
  return {
    accountId,
    id: job.id,
    title: job.title.trim(),
    company: optionalText(job.company),
    location: optionalText(job.location),
    url: url.url,
    canonicalUrl: url.canonicalUrl,
    source: job.source,
    status: job.status,
    jobContext: normalizeContext(job.jobContext),
    descriptionSnapshot: description.descriptionSnapshot,
    descriptionHash: description.descriptionHash,
    jobMatch: asJson(job.jobMatch),
    evaluatedWith: job.evaluatedWith ? asJson(job.evaluatedWith) : null,
    curriculumRecommendation: job.curriculumRecommendation
      ? asJson(job.curriculumRecommendation)
      : null,
    applicationPack: job.applicationPack ? asJson(job.applicationPack) : null,
  };
}

function assertAppliedAtAllowed(status: ApplyFlowApplicationStatus, appliedAt: string | null | undefined): void {
  if (appliedAt == null) return;
  if (!POST_APPLY_STATUSES.has(status)) {
    throw new ApplyFlowMigrationServiceError("invalid_migration_payload");
  }
}

function toApplicationCreateInput(
  accountId: string,
  application: MigrationApplicationInput,
): ApplyFlowApplicationCreateInput {
  assertAppliedAtAllowed(application.status, application.appliedAt);
  return {
    accountId,
    id: application.id,
    sourceJobId: application.sourceJobId ?? null,
    source: application.source,
    status: application.status,
    jobTitle: application.jobTitle !== undefined ? optionalText(application.jobTitle) : null,
    companyName: application.companyName !== undefined ? optionalText(application.companyName) : null,
    jobUrl: application.jobUrl !== undefined ? optionalText(application.jobUrl) : null,
    fitScore: application.fitScore ?? null,
    notes: optionalText(application.notes),
    jobMeta: jsonOrNull(application.jobMeta),
    v2Meta: jsonOrNull(application.v2Meta),
    extras: jsonOrNull(application.extras),
    appliedAt: application.appliedAt ? new Date(application.appliedAt) : null,
  };
}

function jobFingerprintInput(job: MigrationJobInput): MigrationJobFingerprintInput {
  return {
    id: job.id,
    title: job.title,
    company: job.company,
    location: job.location,
    url: job.url,
    source: job.source,
    status: job.status,
    jobContext: job.jobContext,
    descriptionSnapshot: job.descriptionSnapshot,
    jobMatch: job.jobMatch,
    evaluatedWith: job.evaluatedWith,
    curriculumRecommendation: job.curriculumRecommendation,
    applicationPack: job.applicationPack,
  };
}

function applicationFingerprintInput(
  application: MigrationApplicationInput,
): MigrationApplicationFingerprintInput {
  return {
    id: application.id,
    source: application.source,
    status: application.status,
    sourceJobId: application.sourceJobId,
    jobTitle: application.jobTitle,
    companyName: application.companyName,
    jobUrl: application.jobUrl,
    fitScore: application.fitScore,
    notes: application.notes,
    jobMeta: application.jobMeta,
    v2Meta: application.v2Meta,
    extras: application.extras,
  };
}

function normalizeStoredJson(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (value === Prisma.DbNull || value === Prisma.JsonNull) return null;
  return value;
}

function jobMaterialCanonical(input: ApplyFlowJobCreateInput): string {
  return canonicalizeForFingerprint({
    id: input.id,
    title: input.title,
    company: input.company ?? null,
    location: input.location ?? null,
    url: input.url ?? null,
    source: input.source,
    status: input.status,
    jobContext: input.jobContext,
    descriptionSnapshot: input.descriptionSnapshot ?? null,
    jobMatch: input.jobMatch,
    evaluatedWith: normalizeStoredJson(input.evaluatedWith),
    curriculumRecommendation: normalizeStoredJson(input.curriculumRecommendation),
    applicationPack: normalizeStoredJson(input.applicationPack),
  });
}

function applicationMaterialCanonical(input: ApplyFlowApplicationCreateInput): string {
  return canonicalizeForFingerprint({
    id: input.id,
    source: input.source,
    status: input.status,
    sourceJobId: input.sourceJobId ?? null,
    jobTitle: input.jobTitle ?? null,
    companyName: input.companyName ?? null,
    jobUrl: input.jobUrl ?? null,
    fitScore: input.fitScore ?? null,
    notes: input.notes ?? null,
    jobMeta: normalizeStoredJson(input.jobMeta),
    v2Meta: normalizeStoredJson(input.v2Meta),
    extras: normalizeStoredJson(input.extras),
    appliedAt: input.appliedAt ? input.appliedAt.toISOString() : null,
  });
}

function existingJobMaterialCanonical(record: {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  url: string | null;
  source: string;
  status: string;
  jobContext: unknown;
  descriptionSnapshot: string | null;
  jobMatch: unknown;
  evaluatedWith: unknown;
  curriculumRecommendation: unknown;
  applicationPack: unknown;
}): string {
  return canonicalizeForFingerprint({
    id: record.id,
    title: record.title,
    company: record.company,
    location: record.location,
    url: record.url,
    source: record.source,
    status: record.status,
    jobContext: record.jobContext,
    descriptionSnapshot: record.descriptionSnapshot,
    jobMatch: record.jobMatch,
    evaluatedWith: normalizeStoredJson(record.evaluatedWith),
    curriculumRecommendation: normalizeStoredJson(record.curriculumRecommendation),
    applicationPack: normalizeStoredJson(record.applicationPack),
  });
}

function existingApplicationMaterialCanonical(record: {
  id: string;
  source: string;
  status: string;
  sourceJobId: string | null;
  jobTitle: string | null;
  companyName: string | null;
  jobUrl: string | null;
  fitScore: number | null;
  notes: string | null;
  jobMeta: unknown;
  v2Meta: unknown;
  extras: unknown;
  appliedAt: Date | null;
}): string {
  return canonicalizeForFingerprint({
    id: record.id,
    source: record.source,
    status: record.status,
    sourceJobId: record.sourceJobId,
    jobTitle: record.jobTitle,
    companyName: record.companyName,
    jobUrl: record.jobUrl,
    fitScore: record.fitScore,
    notes: record.notes,
    jobMeta: normalizeStoredJson(record.jobMeta),
    v2Meta: normalizeStoredJson(record.v2Meta),
    extras: normalizeStoredJson(record.extras),
    appliedAt: record.appliedAt ? record.appliedAt.toISOString() : null,
  });
}

function detectDuplicateIds(body: MigrationImportBody): MigrationConflict[] {
  const conflicts: MigrationConflict[] = [];
  const jobIds = new Set<string>();
  for (const job of body.jobs) {
    if (jobIds.has(job.id)) {
      conflicts.push({ entityType: "job", entityId: job.id, reason: "duplicate_id_in_bundle" });
    }
    jobIds.add(job.id);
  }
  const appIds = new Set<string>();
  const sourceJobOwners = new Map<string, string>();
  for (const application of body.applications) {
    if (appIds.has(application.id)) {
      conflicts.push({
        entityType: "application",
        entityId: application.id,
        reason: "duplicate_id_in_bundle",
      });
    }
    appIds.add(application.id);
    const sourceJobId = application.sourceJobId ?? null;
    if (sourceJobId) {
      const owner = sourceJobOwners.get(sourceJobId);
      if (owner && owner !== application.id) {
        conflicts.push({
          entityType: "application",
          entityId: application.id,
          reason: "source_job_already_linked",
        });
      } else {
        sourceJobOwners.set(sourceJobId, application.id);
      }
    }
    if (sourceJobId && application.id === sourceJobId) {
      conflicts.push({ entityType: "application", entityId: application.id, reason: "invalid_record" });
    }
  }
  return conflicts;
}

function toCompletionProof(session: ApplyFlowMigrationSession): MigrationCompletionProof {
  if (session.status !== MIGRATION_SESSION_STATUS.completed || !session.completedAt) {
    throw new ApplyFlowMigrationServiceError("migration_session_failed");
  }
  return {
    sessionId: session.id,
    status: "completed",
    fingerprint: session.bundleFingerprint,
    sourceVersion: 1,
    expectedJobs: session.expectedJobs,
    expectedApplications: session.expectedApplications,
    processedJobs: session.processedJobs,
    processedApplications: session.processedApplications,
    completedAt: session.completedAt.toISOString(),
  };
}

function toConflictResponse(
  session: ApplyFlowMigrationSession,
  conflicts: MigrationConflict[],
): MigrationConflictResponse {
  return {
    sessionId: session.id,
    status: "failed",
    fingerprint: session.bundleFingerprint,
    conflicts: conflicts.map((conflict) => ({
      entityType: conflict.entityType,
      entityId: conflict.entityId,
      reason: conflict.reason,
    })),
  };
}

export type MigrationImportResult =
  | { kind: "completed"; proof: MigrationCompletionProof }
  | { kind: "failed"; response: MigrationConflictResponse };

export function createApplyFlowMigrationService(deps?: {
  jobs?: ApplyFlowJobRepository;
  applications?: ApplyFlowApplicationRepository;
  sessions?: ApplyFlowMigrationSessionRepository;
}) {
  const jobs = deps?.jobs ?? applyFlowJobRepository;
  const applications = deps?.applications ?? applyFlowApplicationRepository;
  const sessions = deps?.sessions ?? applyFlowMigrationSessionRepository;

  async function failSession(
    accountId: string,
    session: ApplyFlowMigrationSession,
    conflicts: MigrationConflict[],
    processedJobs: number,
    processedApplications: number,
  ): Promise<MigrationImportResult> {
    const updated = await sessions.update(accountId, session.id, {
      status: MIGRATION_SESSION_STATUS.failed,
      processedJobs,
      processedApplications,
      conflictSummary: conflicts as unknown as Prisma.InputJsonValue,
      completedAt: null,
    });
    return {
      kind: "failed",
      response: toConflictResponse(updated ?? session, conflicts),
    };
  }

  async function verifyCompletion(
    accountId: string,
    body: MigrationImportBody,
  ): Promise<MigrationConflict[]> {
    const conflicts: MigrationConflict[] = [];
    for (const job of body.jobs) {
      const existing = await jobs.findById(accountId, job.id);
      if (!existing) {
        conflicts.push({ entityType: "job", entityId: job.id, reason: "invalid_record" });
        continue;
      }
      const expected = jobMaterialCanonical(toJobCreateInput(accountId, job));
      if (existingJobMaterialCanonical(existing) !== expected) {
        conflicts.push({ entityType: "job", entityId: job.id, reason: "same_id_different_content" });
      }
    }
    for (const application of body.applications) {
      const existing = await applications.findById(accountId, application.id);
      if (!existing) {
        conflicts.push({
          entityType: "application",
          entityId: application.id,
          reason: "invalid_record",
        });
        continue;
      }
      const expected = applicationMaterialCanonical(toApplicationCreateInput(accountId, application));
      if (existingApplicationMaterialCanonical(existing) !== expected) {
        conflicts.push({
          entityType: "application",
          entityId: application.id,
          reason: "same_id_different_content",
        });
      }
      const sourceJobId = application.sourceJobId ?? null;
      if (sourceJobId) {
        const linkedJob = await jobs.findById(accountId, sourceJobId);
        if (!linkedJob) {
          conflicts.push({
            entityType: "application",
            entityId: application.id,
            reason: "source_job_not_found",
          });
        }
      }
    }
    return conflicts;
  }

  return {
    /**
     * Import a V1→V2 migration bundle.
     *
     * Timestamp policy: Job/Application createdAt/updatedAt use server create time.
     * Historical V1 timestamps are intentionally not preserved in F3.2.
     */
    async importBundle(accountId: string, body: MigrationImportBody): Promise<MigrationImportResult> {
      const computed = fingerprintMigrationBundle({
        jobs: body.jobs.map(jobFingerprintInput),
        applications: body.applications.map(applicationFingerprintInput),
      });
      if (computed !== body.fingerprint) {
        throw new ApplyFlowMigrationServiceError("migration_fingerprint_mismatch", [
          { entityType: "bundle", entityId: body.fingerprint, reason: "fingerprint_mismatch" },
        ]);
      }

      const duplicateConflicts = detectDuplicateIds(body);
      if (duplicateConflicts.length > 0) {
        throw new ApplyFlowMigrationServiceError("invalid_migration_payload", duplicateConflicts);
      }

      let session = await sessions.findByFingerprint(accountId, body.sourceVersion, body.fingerprint);
      if (!session) {
        try {
          session = await sessions.create({
            accountId,
            sourceVersion: body.sourceVersion,
            bundleFingerprint: body.fingerprint,
            status: MIGRATION_SESSION_STATUS.pending,
            expectedJobs: body.jobs.length,
            expectedApplications: body.applications.length,
          });
        } catch {
          session = await sessions.findByFingerprint(accountId, body.sourceVersion, body.fingerprint);
          if (!session) throw new ApplyFlowMigrationServiceError("migration_session_failed");
        }
      }

      if (session.status === MIGRATION_SESSION_STATUS.completed) {
        const verification = await verifyCompletion(accountId, body);
        if (verification.length > 0) {
          throw new ApplyFlowMigrationServiceError("migration_session_failed", verification);
        }
        return { kind: "completed", proof: toCompletionProof(session) };
      }

      // pending | importing | failed → resume as importing (never completed → importing)
      session =
        (await sessions.update(accountId, session.id, {
          status: MIGRATION_SESSION_STATUS.importing,
          conflictSummary: null,
          completedAt: null,
          processedJobs: 0,
          processedApplications: 0,
        })) ?? session;

      let processedJobs = 0;
      const jobConflicts: MigrationConflict[] = [];

      for (const job of body.jobs) {
        const input = toJobCreateInput(accountId, job);
        const existing = await jobs.findById(accountId, job.id);
        if (!existing) {
          await jobs.create(input);
          processedJobs += 1;
          continue;
        }
        if (existingJobMaterialCanonical(existing) === jobMaterialCanonical(input)) {
          processedJobs += 1;
          continue;
        }
        jobConflicts.push({
          entityType: "job",
          entityId: job.id,
          reason: "same_id_different_content",
        });
      }

      if (jobConflicts.length > 0) {
        return failSession(accountId, session, jobConflicts, processedJobs, 0);
      }

      let processedApplications = 0;
      const applicationConflicts: MigrationConflict[] = [];

      for (const application of body.applications) {
        try {
          assertAppliedAtAllowed(application.status, application.appliedAt);
        } catch {
          applicationConflicts.push({
            entityType: "application",
            entityId: application.id,
            reason: "invalid_record",
          });
          continue;
        }

        const sourceJobId = application.sourceJobId ?? null;
        if (sourceJobId) {
          const linkedJob = await jobs.findById(accountId, sourceJobId);
          if (!linkedJob) {
            applicationConflicts.push({
              entityType: "application",
              entityId: application.id,
              reason: "source_job_not_found",
            });
            continue;
          }
          const linked = await applications.findBySourceJobId(accountId, sourceJobId);
          const other = linked.find((row) => row.id !== application.id);
          if (other) {
            applicationConflicts.push({
              entityType: "application",
              entityId: application.id,
              reason: "source_job_already_linked",
            });
            continue;
          }
        }

        const input = toApplicationCreateInput(accountId, application);
        const existing = await applications.findById(accountId, application.id);
        if (!existing) {
          await applications.create(input);
          processedApplications += 1;
          continue;
        }
        if (existingApplicationMaterialCanonical(existing) === applicationMaterialCanonical(input)) {
          processedApplications += 1;
          continue;
        }
        applicationConflicts.push({
          entityType: "application",
          entityId: application.id,
          reason: "same_id_different_content",
        });
      }

      if (applicationConflicts.length > 0) {
        return failSession(
          accountId,
          session,
          applicationConflicts,
          processedJobs,
          processedApplications,
        );
      }

      const verification = await verifyCompletion(accountId, body);
      if (verification.length > 0) {
        return failSession(accountId, session, verification, processedJobs, processedApplications);
      }

      const completedAt = new Date();
      const completed = await sessions.update(accountId, session.id, {
        status: MIGRATION_SESSION_STATUS.completed,
        processedJobs,
        processedApplications,
        conflictSummary: null,
        completedAt,
      });
      if (!completed || completed.status !== MIGRATION_SESSION_STATUS.completed) {
        throw new ApplyFlowMigrationServiceError("migration_session_failed");
      }
      return { kind: "completed", proof: toCompletionProof(completed) };
    },

    async getSession(accountId: string, sessionId: string): Promise<MigrationCompletionProof | MigrationConflictResponse | {
      sessionId: string;
      status: string;
      fingerprint: string;
      expectedJobs: number;
      expectedApplications: number;
      processedJobs: number;
      processedApplications: number;
      completedAt: string | null;
    }> {
      const session = await sessions.findById(accountId, sessionId);
      if (!session) throw new ApplyFlowMigrationServiceError("migration_session_not_found");
      if (session.status === MIGRATION_SESSION_STATUS.completed) {
        return toCompletionProof(session);
      }
      if (session.status === MIGRATION_SESSION_STATUS.failed) {
        const conflicts = Array.isArray(session.conflictSummary)
          ? (session.conflictSummary as MigrationConflict[])
          : [];
        return toConflictResponse(session, conflicts);
      }
      return {
        sessionId: session.id,
        status: session.status,
        fingerprint: session.bundleFingerprint,
        expectedJobs: session.expectedJobs,
        expectedApplications: session.expectedApplications,
        processedJobs: session.processedJobs,
        processedApplications: session.processedApplications,
        completedAt: session.completedAt ? session.completedAt.toISOString() : null,
      };
    },
  };
}

export const applyFlowMigrationService = createApplyFlowMigrationService();
