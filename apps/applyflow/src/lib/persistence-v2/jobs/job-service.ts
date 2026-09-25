import {
  canonicalizeJobUrl,
  createApplyFlowJobId,
  hashJobDescription,
  type ApplyFlowJob,
} from "@devflow/applyflow-core";
import type { Prisma } from "@prisma/client";

import {
  applyFlowJobRepository,
  type ApplyFlowJobCreateInput,
  type ApplyFlowJobRepository,
  type ApplyFlowJobUpdateInput,
} from "../repositories";
import type { CreateJobBody, JobResponse, PatchJobBody } from "./job-dto";
import { ApplyFlowJobServiceError } from "./job-errors";

type JobRecord = Awaited<ReturnType<ApplyFlowJobRepository["create"]>>;

function isUniqueViolation(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: unknown }).code === "P2002",
  );
}

function optionalText(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
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

export function toJobResponse(record: JobRecord): JobResponse {
  return {
    id: record.id,
    title: record.title,
    company: record.company,
    location: record.location,
    url: record.url,
    canonicalUrl: record.canonicalUrl,
    source: record.source as ApplyFlowJob["source"],
    status: record.status as ApplyFlowJob["status"],
    jobContext: record.jobContext as ApplyFlowJob["jobContext"],
    descriptionSnapshot: record.descriptionSnapshot,
    descriptionHash: record.descriptionHash,
    jobMatch: record.jobMatch as ApplyFlowJob["jobMatch"],
    evaluatedWith: (record.evaluatedWith as ApplyFlowJob["evaluatedWith"] | null) ?? null,
    curriculumRecommendation:
      (record.curriculumRecommendation as ApplyFlowJob["curriculumRecommendation"] | null) ?? null,
    applicationPack: (record.applicationPack as ApplyFlowJob["applicationPack"] | null) ?? null,
    version: record.version,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function toCreateInput(accountId: string, body: CreateJobBody): ApplyFlowJobCreateInput {
  const url = derivedFromUrl(body.url);
  const description = derivedFromSnapshot(body.descriptionSnapshot);
  return {
    accountId,
    id: body.id ?? createApplyFlowJobId(),
    title: body.title.trim(),
    company: optionalText(body.company),
    location: optionalText(body.location),
    url: url.url,
    canonicalUrl: url.canonicalUrl,
    source: body.source,
    status: body.status,
    jobContext: normalizeContext(body.jobContext),
    descriptionSnapshot: description.descriptionSnapshot,
    descriptionHash: description.descriptionHash,
    jobMatch: asJson(body.jobMatch),
    evaluatedWith: body.evaluatedWith ? asJson(body.evaluatedWith) : null,
    curriculumRecommendation: body.curriculumRecommendation ? asJson(body.curriculumRecommendation) : null,
    applicationPack: body.applicationPack ? asJson(body.applicationPack) : null,
  };
}

function toPatchInput(body: PatchJobBody): ApplyFlowJobUpdateInput {
  const patch: ApplyFlowJobUpdateInput = {};
  if (body.title !== undefined) patch.title = body.title.trim();
  if (body.company !== undefined) patch.company = optionalText(body.company);
  if (body.location !== undefined) patch.location = optionalText(body.location);
  if (body.url !== undefined) {
    const url = derivedFromUrl(body.url);
    patch.url = url.url;
    patch.canonicalUrl = url.canonicalUrl;
  }
  if (body.source !== undefined) patch.source = body.source;
  if (body.status !== undefined) patch.status = body.status;
  if (body.jobContext !== undefined) patch.jobContext = normalizeContext(body.jobContext);
  if (body.descriptionSnapshot !== undefined) {
    const description = derivedFromSnapshot(body.descriptionSnapshot);
    patch.descriptionSnapshot = description.descriptionSnapshot;
    patch.descriptionHash = description.descriptionHash;
  }
  if (body.jobMatch !== undefined) patch.jobMatch = asJson(body.jobMatch);
  if (body.evaluatedWith !== undefined) {
    patch.evaluatedWith = body.evaluatedWith ? asJson(body.evaluatedWith) : null;
  }
  if (body.curriculumRecommendation !== undefined) {
    patch.curriculumRecommendation = body.curriculumRecommendation
      ? asJson(body.curriculumRecommendation)
      : null;
  }
  if (body.applicationPack !== undefined) {
    patch.applicationPack = body.applicationPack ? asJson(body.applicationPack) : null;
  }
  return patch;
}

function compareJobs(left: JobRecord, right: JobRecord): number {
  const byUpdated = right.updatedAt.getTime() - left.updatedAt.getTime();
  if (byUpdated !== 0) return byUpdated;
  if (left.id < right.id) return -1;
  if (left.id > right.id) return 1;
  return 0;
}

export function createApplyFlowJobService(repository: ApplyFlowJobRepository = applyFlowJobRepository) {
  return {
    async create(accountId: string, body: CreateJobBody): Promise<JobResponse> {
      const input = toCreateInput(accountId, body);
      const existing = await repository.findById(accountId, input.id);
      if (existing) {
        throw new ApplyFlowJobServiceError("job_already_exists");
      }
      try {
        const created = await repository.create(input);
        return toJobResponse(created);
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new ApplyFlowJobServiceError("job_already_exists");
        }
        throw error;
      }
    },

    /**
     * Initial F2 list contract: the full account-scoped set, no pagination.
     * Order matches the dashboard (updatedAt descending) with id ascending as tie-break.
     */
    async list(accountId: string): Promise<JobResponse[]> {
      const jobs = await repository.list(accountId);
      return [...jobs].sort(compareJobs).map(toJobResponse);
    },

    async get(accountId: string, id: string): Promise<JobResponse> {
      const job = await repository.findById(accountId, id);
      if (!job) throw new ApplyFlowJobServiceError("not_found");
      return toJobResponse(job);
    },

    async patch(accountId: string, id: string, expectedVersion: number, body: PatchJobBody): Promise<JobResponse> {
      const result = await repository.updateWithVersion(accountId, id, expectedVersion, toPatchInput(body));
      if (!result.ok) {
        throw new ApplyFlowJobServiceError(result.reason === "conflict" ? "version_conflict" : "not_found");
      }
      return toJobResponse(result.record);
    },
  };
}

export type ApplyFlowJobService = ReturnType<typeof createApplyFlowJobService>;

export const applyFlowJobService = createApplyFlowJobService();
