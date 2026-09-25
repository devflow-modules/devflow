import {
  applicationSourceFromJob,
  canTransitionApplicationStatus,
  createApplicationId,
  toPipelineStatusV2,
  type ApplyFlowApplicationStatus,
  type ApplyFlowJob,
} from "@devflow/applyflow-core";
import type { Prisma } from "@prisma/client";

import {
  applyFlowApplicationRepository,
  applyFlowJobRepository,
  type ApplyFlowApplicationCreateInput,
  type ApplyFlowApplicationRepository,
  type ApplyFlowApplicationUpdateInput,
  type ApplyFlowJobRepository,
} from "../repositories";
import type { ApplicationResponse, CreateApplicationBody, PatchApplicationBody } from "./application-dto";
import { ApplyFlowApplicationServiceError } from "./application-errors";

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

function isUniqueViolation(error: unknown): boolean {
  return Boolean(
    error && typeof error === "object" && "code" in error && (error as { code?: unknown }).code === "P2002",
  );
}

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
) {
  return {
    /**
     * Product rule: one Application per sourceJobId for ordinary create-from-job.
     * The database still allows 0..N. Two concurrent creates can both pass the
     * pre-check; F2 does not add a unique constraint or lock to close that race.
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
        if (isUniqueViolation(error)) {
          throw new ApplyFlowApplicationServiceError("application_already_exists");
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
  };
}

export type ApplyFlowApplicationService = ReturnType<typeof createApplyFlowApplicationService>;

export const applyFlowApplicationService = createApplyFlowApplicationService();
