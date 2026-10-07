import {
  importOpportunityPipeline,
  mergeApplyFlowJobs,
  type ApplyFlowJob,
  type Contact,
  type OpportunityPipelineImportResult,
} from "@devflow/applyflow-core";

import { mergeDashboardContacts, APPLYFLOW_DASHBOARD_CONTACTS_STORAGE_KEY } from "@/lib/local-contact-storage";
import { loadDashboardJobs, persistDashboardJobs } from "@/lib/local-job-storage";
import {
  currentPersonalClientScope,
  isStalePersonalGeneration,
  personalLocalWritesAllowed,
  rememberContactVersion,
  writeAccountScopedCache,
} from "@/lib/persistence-v2/personal/client-scope";
import { createV2DashboardPersistence } from "@/lib/persistence-v2/dashboard/v2-remote-dashboard-persistence";

export type OpportunityPipelineApplyResult =
  | (Extract<OpportunityPipelineImportResult, { ok: true }> & {
      mergedJobs?: ApplyFlowJob[];
      storage: "local" | "account";
    })
  | (Extract<OpportunityPipelineImportResult, { ok: false }> & {
      storage?: never;
    })
  | {
      ok: false;
      error:
        | "cloud_read_only"
        | "cloud_paused"
        | "cloud_jobs_failed"
        | "cloud_contacts_failed"
        | "cloud_contacts_conflict"
        | "stale_account_scope";
      jobs: ApplyFlowJob[];
      contacts: Contact[];
      ignoredCount: number;
    };

/**
 * Local-only apply (anonymous / `authority: local`).
 * Must not be used when personal cloud authority is active — callers should use
 * {@link applyOpportunityPipelineJson} which routes by client scope.
 */
export function applyOpportunityPipelineLocal(
  raw: unknown,
  options: { now?: Date } = {},
): OpportunityPipelineImportResult & { mergedJobs?: ApplyFlowJob[] } {
  const result = importOpportunityPipeline(raw, options);
  if (!result.ok) return result;
  if (!personalLocalWritesAllowed()) {
    return {
      ok: false,
      error: "cloud_authority",
      jobs: [],
      contacts: [],
      ignoredCount: 0,
    };
  }
  if (typeof window === "undefined") {
    return { ...result, mergedJobs: result.jobs };
  }
  const existing = loadDashboardJobs().jobs;
  const merged = mergeApplyFlowJobs(existing, result.jobs);
  persistDashboardJobs(merged.jobs);
  const contactsMerged = mergeDashboardContacts(result.contacts);
  if (!contactsMerged.ok) {
    return {
      ok: false,
      error: "cloud_authority",
      jobs: [],
      contacts: [],
      ignoredCount: 0,
    };
  }
  return { ...result, mergedJobs: merged.jobs };
}

async function applyOpportunityPipelineToAccount(
  result: Extract<OpportunityPipelineImportResult, { ok: true }>,
  fetchImpl: typeof fetch,
): Promise<OpportunityPipelineApplyResult> {
  const scope = currentPersonalClientScope();
  const generation = scope.generation;
  if (scope.authority === "cloud_read") {
    return {
      ok: false,
      error: "cloud_read_only",
      jobs: [],
      contacts: [],
      ignoredCount: 0,
    };
  }
  if (scope.authority === "cloud_paused" || scope.authority === "local" || !scope.accountId) {
    return {
      ok: false,
      error: scope.authority === "cloud_paused" ? "cloud_paused" : "stale_account_scope",
      jobs: [],
      contacts: [],
      ignoredCount: 0,
    };
  }

  const persistence = createV2DashboardPersistence(fetchImpl);
  const currentJobs = await persistence.listJobs().catch(() => [] as ApplyFlowJob[]);
  if (isStalePersonalGeneration(generation)) {
    return {
      ok: false,
      error: "stale_account_scope",
      jobs: [],
      contacts: [],
      ignoredCount: 0,
    };
  }
  const jobsMerge = await persistence.mergeJobs(currentJobs, result.jobs);
  if (!jobsMerge.ok) {
    return {
      ok: false,
      error: "cloud_jobs_failed",
      jobs: [],
      contacts: [],
      ignoredCount: 0,
    };
  }
  if (isStalePersonalGeneration(generation)) {
    return {
      ok: false,
      error: "stale_account_scope",
      jobs: [],
      contacts: [],
      ignoredCount: 0,
    };
  }

  if (result.contacts.length > 0) {
    const contactsResponse = await fetchImpl("/api/applyflow/v2/personal-import", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        module: "contacts",
        confirmImport: true,
        contacts: result.contacts,
        interactions: [],
      }),
    });
    if (isStalePersonalGeneration(generation)) {
      return {
        ok: false,
        error: "stale_account_scope",
        jobs: [],
        contacts: [],
        ignoredCount: 0,
      };
    }
    if (contactsResponse.status === 409) {
      return {
        ok: false,
        error: "cloud_contacts_conflict",
        jobs: [],
        contacts: [],
        ignoredCount: 0,
      };
    }
    if (!contactsResponse.ok) {
      return {
        ok: false,
        error: "cloud_contacts_failed",
        jobs: [],
        contacts: [],
        ignoredCount: 0,
      };
    }

    const listed = await fetchImpl("/api/applyflow/v2/contacts", {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });
    if (!isStalePersonalGeneration(generation) && listed.ok) {
      const body = (await listed.json()) as {
        contacts?: Contact[];
        interactions?: unknown[];
        versions?: Record<string, number>;
      };
      for (const [id, version] of Object.entries(body.versions ?? {})) {
        if (typeof version === "number") rememberContactVersion(id, version);
      }
      writeAccountScopedCache(
        APPLYFLOW_DASHBOARD_CONTACTS_STORAGE_KEY,
        JSON.stringify({
          version: 1,
          savedAt: new Date().toISOString(),
          contacts: body.contacts ?? [],
          interactions: body.interactions ?? [],
        }),
      );
    }
  }

  if (isStalePersonalGeneration(generation)) {
    return {
      ok: false,
      error: "stale_account_scope",
      jobs: [],
      contacts: [],
      ignoredCount: 0,
    };
  }

  const refreshed = await persistence.listJobs().catch(() => jobsMerge.data.jobs);
  return {
    ...result,
    ok: true,
    mergedJobs: refreshed,
    storage: "account",
  };
}

/**
 * Applies a private opportunity pipeline document to the active authority:
 * - `local` → anonymous localStorage (legacy)
 * - `cloud_write` → V2 jobs API + `/api/applyflow/v2/personal-import` (contacts)
 * - other cloud modes → fail closed (no silent local orphan copy)
 */
export async function applyOpportunityPipeline(
  raw: unknown,
  options: { now?: Date; fetchImpl?: typeof fetch } = {},
): Promise<OpportunityPipelineApplyResult> {
  const parsed = importOpportunityPipeline(raw, options);
  if (!parsed.ok) return parsed;

  if (personalLocalWritesAllowed()) {
    const local = applyOpportunityPipelineLocal(raw, options);
    if (!local.ok) return local;
    return { ...local, storage: "local" };
  }

  return applyOpportunityPipelineToAccount(parsed, options.fetchImpl ?? fetch);
}

export async function applyOpportunityPipelineJson(
  text: string,
  options: { now?: Date; fetchImpl?: typeof fetch } = {},
): Promise<OpportunityPipelineApplyResult> {
  try {
    return await applyOpportunityPipeline(JSON.parse(text) as unknown, options);
  } catch {
    return {
      ok: false,
      error: "invalid_json",
      jobs: [],
      contacts: [],
      ignoredCount: 0,
    };
  }
}

/** @deprecated Prefer {@link applyOpportunityPipelineJson} (authority-aware). */
export function applyOpportunityPipelineLocalJson(
  text: string,
  options: { now?: Date } = {},
): ReturnType<typeof applyOpportunityPipelineLocal> {
  try {
    return applyOpportunityPipelineLocal(JSON.parse(text) as unknown, options);
  } catch {
    return {
      ok: false,
      error: "invalid_json",
      jobs: [],
      contacts: [],
      ignoredCount: 0,
    };
  }
}

export type { Contact };
