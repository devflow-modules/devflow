import type { CareerBundleUnifiedSyncEnrichment } from "@devflow/career-sync";
import { createCareerBundle, parseCareerBundle } from "../bundle-helpers.js";
import type { CareerApplication } from "../schemas/careerApplication.js";
import type { CareerBundle } from "../schemas/careerBundle.js";
import { careerBundleSyncEnrichmentSchema } from "../schemas/careerBundleSyncEnrichment.js";
import { attachSyncEnrichmentToCareerBundle, validateCareerBundleSyncEnrichment } from "./sync-enrichment.js";
import type {
  CareerBundleSyncEnrichmentStatus,
  CareerBundleWithSyncEnrichment,
} from "./types.js";

export type CreateCareerBundleWithSyncEnrichmentOptions = {
  candidate?: CareerBundle["candidate"];
  syncEnrichment?: CareerBundleUnifiedSyncEnrichment | null;
  exportedAt?: string;
};

export type ParseCareerBundleWithSyncEnrichmentResult =
  | {
      ok: true;
      data: CareerBundleWithSyncEnrichment;
      syncEnrichmentStatus: CareerBundleSyncEnrichmentStatus;
      warnings: string[];
    }
  | { ok: false; error: string };

function extractSyncEnrichmentCandidate(input: unknown): unknown | undefined {
  if (input == null || typeof input !== "object" || !("syncEnrichment" in input)) {
    return undefined;
  }
  const candidate = (input as Record<string, unknown>).syncEnrichment;
  if (candidate == null) {
    return undefined;
  }
  return candidate;
}

function parseSyncEnrichmentCandidate(
  candidate: unknown,
): {
  status: CareerBundleSyncEnrichmentStatus;
  syncEnrichment?: CareerBundleUnifiedSyncEnrichment;
  warnings: string[];
} {
  const structural = careerBundleSyncEnrichmentSchema.safeParse(candidate);
  if (!structural.success) {
    const msg = structural.error.issues
      .map((i) => `${i.path.join(".") || "syncEnrichment"}: ${i.message}`)
      .join("; ");
    return {
      status: "invalid",
      warnings: [msg || "Invalid sync enrichment structure."],
    };
  }

  return validateCareerBundleSyncEnrichment(
    structural.data as CareerBundleUnifiedSyncEnrichment,
  );
}

export function createCareerBundleWithSyncEnrichment(
  applications: CareerApplication[],
  options?: CreateCareerBundleWithSyncEnrichmentOptions,
): CareerBundleWithSyncEnrichment {
  const base = createCareerBundle(applications, options?.candidate);
  const bundle =
    options?.exportedAt != null ? { ...base, exportedAt: options.exportedAt } : base;

  return attachSyncEnrichmentToCareerBundle(bundle, {
    syncEnrichment: options?.syncEnrichment,
  });
}

export function parseCareerBundleWithSyncEnrichment(
  input: unknown,
): ParseCareerBundleWithSyncEnrichmentResult {
  const base = parseCareerBundle(input);
  if (!base.ok) {
    return { ok: false, error: base.error };
  }

  const syncCandidate = extractSyncEnrichmentCandidate(input);
  if (syncCandidate === undefined) {
    return {
      ok: true,
      data: base.data,
      syncEnrichmentStatus: "not_provided",
      warnings: [],
    };
  }

  const syncResult = parseSyncEnrichmentCandidate(syncCandidate);
  if (syncResult.status !== "provided" || !syncResult.syncEnrichment) {
    return {
      ok: true,
      data: base.data,
      syncEnrichmentStatus: syncResult.status,
      warnings: syncResult.warnings,
    };
  }

  return {
    ok: true,
    data: attachSyncEnrichmentToCareerBundle(base.data, {
      syncEnrichment: syncResult.syncEnrichment,
    }),
    syncEnrichmentStatus: "provided",
    warnings: syncResult.warnings,
  };
}

export function serializeCareerBundleWithSyncEnrichment(
  bundle: CareerBundleWithSyncEnrichment,
): string {
  const base = parseCareerBundle(bundle);
  if (!base.ok) {
    throw new Error(base.error);
  }

  const payload: CareerBundleWithSyncEnrichment = { ...base.data };

  if (bundle.syncEnrichment != null) {
    const validation = validateCareerBundleSyncEnrichment(bundle.syncEnrichment);
    if (validation.status === "provided" && validation.syncEnrichment) {
      payload.syncEnrichment = validation.syncEnrichment;
    }
  }

  return JSON.stringify(payload);
}
