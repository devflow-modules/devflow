import { z } from "zod";

const optionalString = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  });

const optionalNumber = z.union([z.number(), z.null(), z.undefined()]).transform((value) => {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
});

const optionalTags = z
  .union([z.array(z.union([z.string(), z.number()])), z.null(), z.undefined()])
  .transform((value) => {
    if (!Array.isArray(value)) return undefined;
    const tags = value
      .map((item) => String(item).trim())
      .filter((item) => item.length > 0);
    return tags.length > 0 ? tags : undefined;
  });

/** Metadata / legal preamble that Remote OK places as array[0]. */
export const remoteOkMetadataSchema = z
  .object({
    last_updated: z.union([z.number(), z.string()]).optional(),
    legal: z.string().optional(),
  })
  .passthrough();

export const remoteOkJobSchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    position: z.string().min(1),
    company: z.string().min(1),
    description: z.string().min(1),
    url: z.string().min(1),
    date: optionalString,
    epoch: optionalNumber,
    location: optionalString,
    tags: optionalTags,
    apply_url: optionalString,
    salary_min: optionalNumber,
    salary_max: optionalNumber,
    slug: optionalString,
  })
  .passthrough();

export type RemoteOkJob = z.infer<typeof remoteOkJobSchema>;
export type RemoteOkMetadata = z.infer<typeof remoteOkMetadataSchema>;

export function isRemoteOkMetadata(entry: unknown): boolean {
  if (!entry || typeof entry !== "object") return false;
  const record = entry as Record<string, unknown>;
  const hasLegal = typeof record.legal === "string";
  const hasLastUpdated = "last_updated" in record;
  const looksLikeJob =
    ("id" in record && "position" in record) ||
    ("id" in record && "company" in record && "description" in record);
  return (hasLegal || hasLastUpdated) && !looksLikeJob;
}

export function parseRemoteOkJob(entry: unknown): RemoteOkJob | null {
  if (isRemoteOkMetadata(entry)) return null;
  const parsed = remoteOkJobSchema.safeParse(entry);
  return parsed.success ? parsed.data : null;
}

/**
 * Policy: overall payload must be a non-empty array.
 * Metadata is skipped; each job is validated independently.
 * If zero valid jobs remain after parsing, treat as invalid_provider_response at the caller.
 */
export function parseRemoteOkCatalog(body: unknown): { metadata: RemoteOkMetadata | null; jobs: RemoteOkJob[] } | null {
  if (!Array.isArray(body) || body.length === 0) return null;

  let metadata: RemoteOkMetadata | null = null;
  const jobs: RemoteOkJob[] = [];

  for (const entry of body) {
    if (isRemoteOkMetadata(entry)) {
      const meta = remoteOkMetadataSchema.safeParse(entry);
      if (meta.success) metadata = meta.data;
      continue;
    }
    const job = parseRemoteOkJob(entry);
    if (job) jobs.push(job);
  }

  if (jobs.length === 0) return null;
  return { metadata, jobs };
}
