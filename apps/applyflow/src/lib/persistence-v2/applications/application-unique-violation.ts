/**
 * Differentiates Application unique violations under AF-REL-001.
 *
 * Do NOT map every Prisma P2002 to application_already_exists_for_job:
 * the composite primary key (accountId, id) also raises P2002.
 *
 * The partial unique index name is authoritative when present in meta.target.
 * Field-name heuristics cover Prisma adapters that report column/field names.
 */

export const APPLYFLOW_APPLICATION_SOURCE_JOB_UNIQUE_INDEX =
  "applyflow_applications_account_id_source_job_id_uidx";

export type ApplicationUniqueViolationKind = "source_job" | "primary_key" | "unknown";

function isP2002(error: unknown): boolean {
  return Boolean(
    error && typeof error === "object" && "code" in error && (error as { code?: unknown }).code === "P2002",
  );
}

function normalizeTargets(error: unknown): string[] {
  if (!error || typeof error !== "object" || !("meta" in error)) return [];
  const meta = (error as { meta?: { target?: unknown; constraint?: unknown } }).meta;
  const collected: string[] = [];
  const push = (value: unknown) => {
    if (typeof value === "string" && value.trim()) collected.push(value);
    else if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string" && item.trim()) collected.push(item);
      }
    }
  };
  push(meta?.target);
  push(meta?.constraint);
  return collected;
}

function looksLikeSourceJobTarget(target: string): boolean {
  const lower = target.toLowerCase();
  if (lower === APPLYFLOW_APPLICATION_SOURCE_JOB_UNIQUE_INDEX.toLowerCase()) return true;
  if (lower.includes("source_job_id") || lower.includes("sourcejobid")) return true;
  if (lower.includes("source_job") && lower.includes("uidx")) return true;
  return false;
}

function looksLikePrimaryKeyTarget(target: string): boolean {
  const lower = target.toLowerCase();
  if (lower.includes("pkey") || lower.includes("_pkey")) return true;
  if (lower === "id" || lower === "accountid" || lower === "account_id") return true;
  if (lower.includes("account_id_id") || lower.includes("accountid_id")) return true;
  return false;
}

/**
 * Classifies a Prisma unique violation for ApplyFlowApplication creates.
 * Returns null when the error is not a P2002.
 */
export function classifyApplicationUniqueViolation(
  error: unknown,
): ApplicationUniqueViolationKind | null {
  if (!isP2002(error)) return null;
  const targets = normalizeTargets(error);
  if (targets.some(looksLikeSourceJobTarget)) return "source_job";
  if (targets.some(looksLikePrimaryKeyTarget)) return "primary_key";
  // Prisma sometimes reports compound targets as ["accountId","sourceJobId"].
  const normalized = targets.map((t) => t.toLowerCase().replace(/_/g, ""));
  const hasAccount = normalized.some((t) => t === "accountid" || t.includes("accountid"));
  const hasSourceJob = normalized.some((t) => t.includes("sourcejob"));
  const hasId = normalized.some((t) => t === "id");
  if (hasAccount && hasSourceJob) return "source_job";
  if (hasAccount && hasId && !hasSourceJob) return "primary_key";
  return "unknown";
}

export function isUniqueViolation(error: unknown): boolean {
  return isP2002(error);
}

/** Builds a P2002-like error for in-memory harnesses (MEMORY VERIFIED path). */
export function createMemoryUniqueViolation(
  kind: Exclude<ApplicationUniqueViolationKind, "unknown">,
): Error {
  const error = new Error("unique");
  if (kind === "source_job") {
    Object.assign(error, {
      code: "P2002",
      meta: { target: [APPLYFLOW_APPLICATION_SOURCE_JOB_UNIQUE_INDEX] },
    });
  } else {
    Object.assign(error, {
      code: "P2002",
      meta: { target: ["accountId", "id"] },
    });
  }
  return error;
}
