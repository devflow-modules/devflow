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

export const patchJobBodySchema = mutableJobSchema
  .partial()
  .extend({
    title: titleSchema.optional(),
  })
  .strict();

export type CreateJobBody = z.infer<typeof createJobBodySchema>;
export type PatchJobBody = z.infer<typeof patchJobBodySchema>;

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

export function parsePatchJobBody(raw: unknown): PatchJobBody {
  const parsed = patchJobBodySchema.safeParse(raw);
  if (!parsed.success) {
    throw new ApplyFlowJobServiceError("invalid_payload");
  }
  if (Object.keys(parsed.data).length === 0) {
    throw new ApplyFlowJobServiceError("empty_patch");
  }
  return parsed.data;
}

/**
 * Canonical If-Match for a Job version. Exactly one quoted positive integer.
 * Example: If-Match: "3"
 */
const IF_MATCH_VERSION = /^"([1-9]\d*)"$/;

export function parseJobIfMatch(header: string | null): number {
  if (header == null) {
    throw new ApplyFlowJobServiceError("invalid_if_match");
  }
  const match = IF_MATCH_VERSION.exec(header.trim());
  if (!match) {
    throw new ApplyFlowJobServiceError("invalid_if_match");
  }
  const version = Number(match[1]);
  if (!Number.isSafeInteger(version)) {
    throw new ApplyFlowJobServiceError("invalid_if_match");
  }
  return version;
}

export function jobVersionEtag(version: number): string {
  return `"${version}"`;
}
