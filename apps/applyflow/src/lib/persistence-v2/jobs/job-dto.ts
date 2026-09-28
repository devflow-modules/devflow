import {
  applyFlowStoredJobSchema,
  type ApplyFlowJob,
} from "@devflow/applyflow-core";
import { z } from "zod";

import { ApplyFlowJobServiceError } from "./job-errors";

/**
 * Public Jobs API body. Derived fields (`canonicalUrl`, `descriptionHash`),
 * ownership (`accountId`), concurrency (`version`) and server timestamps
 * are not client input.
 */
const mutableJobSchema = applyFlowStoredJobSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  descriptionHash: true,
});

const jobIdSchema = z.string().trim().min(1).max(200);
const titleSchema = z.string().trim().min(1).max(200);

export const createJobBodySchema = mutableJobSchema
  .extend({
    id: jobIdSchema.optional(),
    title: titleSchema,
  })
  .strict();

/**
 * PATCH body. Optimistic concurrency uses application-level `expectedVersion`
 * (NOT HTTP If-Match) so Vercel/CDN cannot rewrite successful mutations as 412.
 */
export const patchJobBodySchema = mutableJobSchema
  .partial()
  .extend({
    title: titleSchema.optional(),
    expectedVersion: z.number().int().positive(),
  })
  .strict();

export type CreateJobBody = z.infer<typeof createJobBodySchema>;
export type PatchJobBody = Omit<z.infer<typeof patchJobBodySchema>, "expectedVersion">;
export type JobPatchRequest = {
  expectedVersion: number;
  patch: PatchJobBody;
};

export type JobResponse = {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  url: string | null;
  canonicalUrl: string | null;
  source: ApplyFlowJob["source"];
  status: ApplyFlowJob["status"];
  jobContext: ApplyFlowJob["jobContext"];
  descriptionSnapshot: string | null;
  descriptionHash: string | null;
  jobMatch: ApplyFlowJob["jobMatch"];
  evaluatedWith: ApplyFlowJob["evaluatedWith"] | null;
  curriculumRecommendation: ApplyFlowJob["curriculumRecommendation"] | null;
  applicationPack: ApplyFlowJob["applicationPack"] | null;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export function parseCreateJobBody(raw: unknown): CreateJobBody {
  const parsed = createJobBodySchema.safeParse(raw);
  if (!parsed.success) {
    throw new ApplyFlowJobServiceError("invalid_payload");
  }
  return parsed.data;
}

export function parseJobPatchRequest(raw: unknown): JobPatchRequest {
  const parsed = patchJobBodySchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues;
    const expectedVersionIssue = issues.some((issue) => issue.path[0] === "expectedVersion");
    if (expectedVersionIssue && issues.every((issue) => issue.path[0] === "expectedVersion")) {
      throw new ApplyFlowJobServiceError("invalid_expected_version");
    }
    throw new ApplyFlowJobServiceError("invalid_payload");
  }
  const { expectedVersion, ...patch } = parsed.data;
  if (Object.keys(patch).length === 0) {
    throw new ApplyFlowJobServiceError("empty_patch");
  }
  return { expectedVersion, patch };
}

/** @deprecated Prefer parseJobPatchRequest — retained only for informational ETag formatting. */
export function parsePatchJobBody(raw: unknown): PatchJobBody {
  return parseJobPatchRequest(raw).patch;
}

/**
 * Informational ETag for Job responses. Not used as the concurrency transport.
 * Example: ETag: "3"
 */
export function jobVersionEtag(version: number): string {
  return `"${version}"`;
}
