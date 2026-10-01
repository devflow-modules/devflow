import {
  applicationSourceFromJob,
  canTransitionApplicationStatus,
  createApplicationId,
  toPipelineStatusV2,
  type ApplyFlowApplicationStatus,
  type ApplyFlowJob,
} from "@devflow/applyflow-core";
import type { Prisma } from "@prisma/client";

import { applyflowPrisma } from "../db";
import {
  applyFlowApplicationRepository,
  applyFlowJobRepository,
  createApplyFlowApplicationRepository,
  createApplyFlowJobRepository,
  type ApplyFlowApplicationCreateInput,
  type ApplyFlowApplicationRepository,
  type ApplyFlowApplicationUpdateInput,
  type ApplyFlowJobRepository,
  type ApplyFlowPersistenceDb,
} from "../repositories";
import { toJobResponse } from "../jobs/job-service";
import type { JobResponse } from "../jobs/job-dto";
import type { ApplicationResponse, CreateApplicationBody, PatchApplicationBody } from "./application-dto";
import { ApplyFlowApplicationServiceError } from "./application-errors";
import {
  classifyApplicationUniqueViolation,
  isUniqueViolation,
} from "./application-unique-violation";

export type ApplicationLifecycleTransitionResult = {
  application: ApplicationResponse;
  job: JobResponse | null;
  jobSynced: boolean;
};

type ApplicationRecord = Awaited<ReturnType<ApplyFlowApplicationRepository["create"]>>;

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

export function toApplicationResponse(record: ApplicationRecord): ApplicationResponse {
  return {
    id: record.id,
    sourceJobId: record.sourceJobId,
    source: record.source as ApplicationResponse["source"],
    status: record.status as ApplyFlowApplicationStatus,
    jobTitle: record.jobTitle,
    companyName: record.companyName,
    jobUrl: record.jobUrl,
    fitScore: record.fitScore,
    notes: record.notes,
    jobMeta: (record.jobMeta as ApplicationResponse["jobMeta"]) ?? null,
    v2Meta: (record.v2Meta as ApplicationResponse["v2Meta"]) ?? null,
    extras: (record.extras as ApplicationResponse["extras"]) ?? null,
    appliedAt: record.appliedAt ? record.appliedAt.toISOString() : null,
    version: record.version,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function assertAppliedAtAllowed(status: ApplyFlowApplicationStatus, appliedAt: string | null | undefined): void {
  if (appliedAt == null) return;
  if (!POST_APPLY_STATUSES.has(status)) {
    throw new ApplyFlowApplicationServiceError("invalid_payload");
  }
}

function resolveCreateAppliedAt(
  status: ApplyFlowApplicationStatus,
  requested: string | null | undefined,
  now: Date,
): Date | null {
  assertAppliedAtAllowed(status, requested);
  if (requested) return new Date(requested);
  if (status === "applied") return now;
  return null;
}

function resolvePatchAppliedAt(
  status: ApplyFlowApplicationStatus,
  requested: string | null | undefined,
  existing: Date | null,
  statusChangedToApplied: boolean,
  now: Date,
): Date | undefined {
  if (requested === null) {
    throw new ApplyFlowApplicationServiceError("invalid_payload");
  }
  assertAppliedAtAllowed(status, requested);
  if (existing && requested && new Date(requested).getTime() !== existing.getTime()) {
    throw new ApplyFlowApplicationServiceError("invalid_payload");
  }
  if (existing) return undefined;
  if (requested) return new Date(requested);
  if (statusChangedToApplied) return now;
  return undefined;
}

function assertStatusTransition(current: ApplyFlowApplicationStatus, next: ApplyFlowApplicationStatus): void {
  if (current === next) return;
  const allowed = canTransitionApplicationStatus(toPipelineStatusV2(current), toPipelineStatusV2(next));
  if (!allowed) throw new ApplyFlowApplicationServiceError("invalid_status_transition");
}

function compareApplications(left: ApplicationRecord, right: ApplicationRecord): number {
  const byUpdated = right.updatedAt.getTime() - left.updatedAt.getTime();
  if (byUpdated !== 0) return byUpdated;
  if (left.id < right.id) return -1;
  if (left.id > right.id) return 1;
  return 0;
}

export function createApplyFlowApplicationService(
  applications: ApplyFlowApplicationRepository = applyFlowApplicationRepository,
  jobs: ApplyFlowJobRepository = applyFlowJobRepository,
  db: ApplyFlowPersistenceDb = applyflowPrisma as unknown as ApplyFlowPersistenceDb,
) {
  return {
    /**
     * Product rule: ≤1 Application per (accountId, sourceJobId) when sourceJobId is set.
     *
     * findBySourceJobId is a UX / fast-path conflict only. Correctness under
     * concurrency is owned by the PostgreSQL partial unique index
     * `applyflow_applications_account_id_source_job_id_uidx` (AF-REL-001).
     * Losing racers map P2002 on that index to application_already_exists_for_job.
     */
    async create(accountId: string, body: CreateApplicationBody, now = new Date()): Promise<ApplicationResponse> {
      const sourceJobId = body.sourceJobId ?? null;
      const id = body.id ?? createApplicationId(sourceJobId ?? "standalone", now);
      if (sourceJobId && id === sourceJobId) {
        throw new ApplyFlowApplicationServiceError("invalid_payload");
      }

      let linkedJob: ApplyFlowJob | null = null;
      if (sourceJobId) {
        const job = await jobs.findById(accountId, sourceJobId);
        if (!job) throw new ApplyFlowApplicationServiceError("source_job_not_found");
        linkedJob = {
          id: job.id,
          title: job.title,
          company: job.company ?? undefined,
          url: job.url ?? undefined,
          source: job.source as ApplyFlowJob["source"],
          status: job.status as ApplyFlowJob["status"],
          jobContext: job.jobContext as ApplyFlowJob["jobContext"],
          jobMatch: job.jobMatch as ApplyFlowJob["jobMatch"],
          createdAt: job.createdAt.toISOString(),
          updatedAt: job.updatedAt.toISOString(),
        };
        const existingForJob = await applications.findBySourceJobId(accountId, sourceJobId);
        if (existingForJob.length > 0) {
          throw new ApplyFlowApplicationServiceError("application_already_exists_for_job");
        }
      }

      const status = body.status ?? "reviewing";
      const source = body.source ?? (linkedJob ? applicationSourceFromJob(linkedJob) : "linkedin");
      const input: ApplyFlowApplicationCreateInput = {
        accountId,
        id,
        sourceJobId,
        source,
        status,
        jobTitle:
          body.jobTitle !== undefined ? optionalText(body.jobTitle) : (linkedJob?.title ?? null),
        companyName:
          body.companyName !== undefined ? optionalText(body.companyName) : (linkedJob?.company ?? null),
        jobUrl: body.jobUrl !== undefined ? optionalText(body.jobUrl) : (linkedJob?.url ?? null),
        fitScore: body.fitScore ?? null,
        notes: optionalText(body.notes),
        jobMeta: jsonOrNull(body.jobMeta),
        v2Meta: jsonOrNull(body.v2Meta),
        extras: jsonOrNull(body.extras),
        appliedAt: resolveCreateAppliedAt(status, body.appliedAt, now),
      };

      const existing = await applications.findById(accountId, id);
      if (existing) throw new ApplyFlowApplicationServiceError("application_already_exists");

      try {
        return toApplicationResponse(await applications.create(input));
      } catch (error) {
        const uniqueKind = classifyApplicationUniqueViolation(error);
        if (uniqueKind === "source_job") {
          throw new ApplyFlowApplicationServiceError("application_already_exists_for_job");
        }
        if (uniqueKind === "primary_key") {
          throw new ApplyFlowApplicationServiceError("application_already_exists");
        }
        if (uniqueKind === "unknown" || isUniqueViolation(error)) {
          // Ambiguous P2002 (raw adapter metadata): resolve by post-check, never 500.
          if (sourceJobId) {
            const linked = await applications.findBySourceJobId(accountId, sourceJobId);
            if (linked.some((row) => row.id !== id)) {
              throw new ApplyFlowApplicationServiceError("application_already_exists_for_job");
            }
          }
          const sameId = await applications.findById(accountId, id);
          if (sameId) {
            throw new ApplyFlowApplicationServiceError("application_already_exists");
          }
          if (isUniqueViolation(error)) {
            throw new ApplyFlowApplicationServiceError("application_already_exists");
          }
        }
        throw error;
      }
    },

    /** Initial F2 list: full account set, no pagination. updatedAt DESC, id ASC. */
    async list(accountId: string): Promise<ApplicationResponse[]> {
      const rows = await applications.list(accountId);
      return [...rows].sort(compareApplications).map(toApplicationResponse);
    },

    async get(accountId: string, id: string): Promise<ApplicationResponse> {
      const row = await applications.findById(accountId, id);
      if (!row) throw new ApplyFlowApplicationServiceError("not_found");
      return toApplicationResponse(row);
    },

    async patch(
      accountId: string,
      id: string,
      expectedVersion: number,
      body: PatchApplicationBody,
      now = new Date(),
    ): Promise<ApplicationResponse> {
      const current = await applications.findById(accountId, id);
      if (!current) throw new ApplyFlowApplicationServiceError("not_found");

      if (body.sourceJobId !== undefined && (body.sourceJobId ?? null) !== current.sourceJobId) {
        throw new ApplyFlowApplicationServiceError("invalid_payload");
      }

      const nextStatus = (body.status ?? current.status) as ApplyFlowApplicationStatus;
      assertStatusTransition(current.status as ApplyFlowApplicationStatus, nextStatus);

      const patch: ApplyFlowApplicationUpdateInput = {};
      if (body.source !== undefined) patch.source = body.source;
      if (body.status !== undefined) patch.status = nextStatus;
      if (body.jobTitle !== undefined) patch.jobTitle = optionalText(body.jobTitle);
      if (body.companyName !== undefined) patch.companyName = optionalText(body.companyName);
      if (body.jobUrl !== undefined) patch.jobUrl = optionalText(body.jobUrl);
      if (body.fitScore !== undefined) patch.fitScore = body.fitScore;
      if (body.notes !== undefined) patch.notes = optionalText(body.notes);
      if (body.jobMeta !== undefined) patch.jobMeta = jsonOrNull(body.jobMeta);
      if (body.v2Meta !== undefined) patch.v2Meta = jsonOrNull(body.v2Meta);
      if (body.extras !== undefined) patch.extras = jsonOrNull(body.extras);

      const appliedAt = resolvePatchAppliedAt(
        nextStatus,
        body.appliedAt,
        current.appliedAt,
        body.status === "applied" && current.status !== "applied" && current.appliedAt == null,
        now,
      );
      if (appliedAt !== undefined) patch.appliedAt = appliedAt;

      if (Object.keys(patch).length === 0) {
        throw new ApplyFlowApplicationServiceError("empty_patch");
      }

      const result = await applications.updateWithVersion(accountId, id, expectedVersion, patch);
      if (!result.ok) {
        throw new ApplyFlowApplicationServiceError(result.reason === "conflict" ? "version_conflict" : "not_found");
      }
      return toApplicationResponse(result.record);
    },

    /**
     * Atomic Application status transition + linked Job status sync (same tenant).
     * Uses Prisma $transaction so partial Job sync cannot leave a false "full success".
     * Missing / foreign-tenant linked Job → Application commits, jobSynced=false.
     */
    async transitionLifecycle(
      accountId: string,
      id: string,
      expectedVersion: number,
      body: Pick<PatchApplicationBody, "status" | "notes">,
      now = new Date(),
    ): Promise<ApplicationLifecycleTransitionResult> {
      if (body.status == null) {
        throw new ApplyFlowApplicationServiceError("invalid_payload");
      }

      return db.$transaction(async (tx) => {
        const txApps = createApplyFlowApplicationRepository(tx);
        const txJobs = createApplyFlowJobRepository(tx);

        const current = await txApps.findById(accountId, id);
        if (!current) throw new ApplyFlowApplicationServiceError("not_found");

        const nextStatus = body.status as ApplyFlowApplicationStatus;
        assertStatusTransition(current.status as ApplyFlowApplicationStatus, nextStatus);

        const patch: ApplyFlowApplicationUpdateInput = { status: nextStatus };
        if (body.notes !== undefined) patch.notes = optionalText(body.notes);

        const appliedAt = resolvePatchAppliedAt(
          nextStatus,
          undefined,
          current.appliedAt,
          nextStatus === "applied" && current.status !== "applied" && current.appliedAt == null,
          now,
        );
        if (appliedAt !== undefined) patch.appliedAt = appliedAt;

        const appResult = await txApps.updateWithVersion(accountId, id, expectedVersion, patch);
        if (!appResult.ok) {
          throw new ApplyFlowApplicationServiceError(
            appResult.reason === "conflict" ? "version_conflict" : "not_found",
          );
        }

        const sourceJobId = appResult.record.sourceJobId;
        if (!sourceJobId) {
          return {
            application: toApplicationResponse(appResult.record),
            job: null,
            jobSynced: false,
          };
        }

        const linked = await txJobs.findById(accountId, sourceJobId);
        if (!linked) {
          return {
            application: toApplicationResponse(appResult.record),
            job: null,
            jobSynced: false,
          };
        }

        if (linked.status === nextStatus) {
          return {
            application: toApplicationResponse(appResult.record),
            job: toJobResponse(linked),
            jobSynced: false,
          };
        }

        const jobResult = await txJobs.updateWithVersion(accountId, linked.id, linked.version, {
          status: nextStatus,
        });
        if (!jobResult.ok) {
          // Surface as conflict so the whole transaction rolls back — no false success.
          throw new ApplyFlowApplicationServiceError(
            jobResult.reason === "conflict" ? "version_conflict" : "not_found",
          );
        }

        return {
          application: toApplicationResponse(appResult.record),
          job: toJobResponse(jobResult.record),
          jobSynced: true,
        };
      });
    },
  };
}

export type ApplyFlowApplicationService = ReturnType<typeof createApplyFlowApplicationService>;

export const applyFlowApplicationService = createApplyFlowApplicationService();
