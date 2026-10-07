/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  APPLYFLOW_DASHBOARD_CONTACTS_STORAGE_KEY,
  loadDashboardContacts,
  mergeDashboardContacts,
} from "@/lib/local-contact-storage";
import { APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY, loadDashboardJobs } from "@/lib/local-job-storage";
import {
  bindPersonalClientScope,
  resetPersonalClientScopeForTests,
} from "@/lib/persistence-v2/personal/client-scope";

import {
  applyOpportunityPipeline,
  applyOpportunityPipelineLocal,
} from "./import-opportunity-pipeline-local";

const ACCOUNT_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ACCOUNT_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function pipelineDoc(overrides: Record<string, unknown> = {}) {
  return {
    version: 1,
    kind: "applyflow-opportunity-pipeline",
    opportunities: [
      {
        company: "Synth Co",
        role: "Platform Engineer",
        matchScore: 82,
        decision: "apply",
        networkingStrategy: "warm_intro",
        contact: {
          name: "Alex Synthetic",
          relation: "engineer",
          confidence: "medium",
          linkedinUrl: "https://www.linkedin.com/in/alex-synthetic",
          outreachMessage: "Synthetic outreach draft",
          outreachStatus: "MESSAGE_PREPARED",
        },
      },
    ],
    ...overrides,
  };
}

afterEach(() => {
  resetPersonalClientScopeForTests();
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("opportunity pipeline import locality", () => {
  it("writes anonymous local keys only under local authority", () => {
    bindPersonalClientScope({ accountId: null, authority: "local" });
    const result = applyOpportunityPipelineLocal(pipelineDoc());
    expect(result.ok).toBe(true);
    expect(loadDashboardJobs().jobs).toHaveLength(1);
    expect(loadDashboardContacts().contacts).toHaveLength(1);
    expect(window.localStorage.getItem(APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY)).toBeTruthy();
    expect(window.localStorage.getItem(APPLYFLOW_DASHBOARD_CONTACTS_STORAGE_KEY)).toBeTruthy();
  });

  it("refuses local merge under cloud_write (no anonymous orphan copy)", () => {
    bindPersonalClientScope({ accountId: ACCOUNT_A, authority: "cloud_write" });
    const local = applyOpportunityPipelineLocal(pipelineDoc());
    expect(local.ok).toBe(false);
    expect(local).toMatchObject({ error: "cloud_authority" });
    expect(mergeDashboardContacts([])).toEqual({ ok: false, error: "cloud_authority" });
    expect(window.localStorage.getItem(APPLYFLOW_DASHBOARD_CONTACTS_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY)).toBeNull();
  });

  it("routes cloud_write import through jobs API + personal-import", async () => {
    bindPersonalClientScope({ accountId: ACCOUNT_A, authority: "cloud_write" });
    const createdJobs: unknown[] = [];
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (url.includes("/api/applyflow/v2/jobs") && method === "GET") {
        return new Response(JSON.stringify({ jobs: createdJobs }), { status: 200 });
      }
      if (url.includes("/api/applyflow/v2/jobs") && method === "POST") {
        const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
        const row = {
          ...body,
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        createdJobs.push(row);
        return new Response(JSON.stringify(row), { status: 201 });
      }
      if (url.includes("/api/applyflow/v2/personal-import") && method === "POST") {
        return new Response(
          JSON.stringify({
            module: "contacts",
            status: "completed",
            processedCount: 1,
            expectedCount: 1,
            conflicts: [],
            resumed: false,
            accountId: ACCOUNT_A,
          }),
          { status: 200 },
        );
      }
      if (url.includes("/api/applyflow/v2/contacts") && method === "GET") {
        return new Response(
          JSON.stringify({
            contacts: [
              {
                id: "contact-synth",
                jobId: "job-1",
                name: "Alex Synthetic",
                type: "engineer",
                status: "MESSAGE_PREPARED",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
            interactions: [],
            versions: { "contact-synth": 1 },
          }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({ error: "unexpected" }), { status: 500 });
    });

    const result = await applyOpportunityPipeline(pipelineDoc(), { fetchImpl: fetchImpl as typeof fetch });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.storage).toBe("account");
    expect(fetchImpl).toHaveBeenCalled();
    const personalImportCall = fetchImpl.mock.calls.find(([url, init]) =>
      String(url).includes("/personal-import") && (init as RequestInit | undefined)?.method === "POST",
    );
    expect(personalImportCall).toBeTruthy();
    const body = JSON.parse(String((personalImportCall?.[1] as RequestInit).body));
    expect(body.confirmImport).toBe(true);
    expect(body.module).toBe("contacts");
    expect(window.localStorage.getItem(APPLYFLOW_DASHBOARD_CONTACTS_STORAGE_KEY)).toBeNull();
    expect(
      window.localStorage.getItem(`${APPLYFLOW_DASHBOARD_CONTACTS_STORAGE_KEY}::${ACCOUNT_A}`),
    ).toBeTruthy();
  });

  it("drops in-flight cloud import after account A→B switch", async () => {
    bindPersonalClientScope({ accountId: ACCOUNT_A, authority: "cloud_write" });
    let resolveJobs: ((value: Response) => void) | undefined;
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (url.includes("/api/applyflow/v2/jobs") && method === "GET") {
        return await new Promise<Response>((resolve) => {
          resolveJobs = resolve;
        });
      }
      return new Response(JSON.stringify({ error: "unexpected" }), { status: 500 });
    });

    const pending = applyOpportunityPipeline(pipelineDoc(), { fetchImpl: fetchImpl as typeof fetch });
    bindPersonalClientScope({ accountId: ACCOUNT_B, authority: "cloud_write" });
    resolveJobs?.(new Response(JSON.stringify({ jobs: [] }), { status: 200 }));
    const result = await pending;
    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ error: "stale_account_scope" });
    expect(window.localStorage.getItem(APPLYFLOW_DASHBOARD_CONTACTS_STORAGE_KEY)).toBeNull();
    expect(
      window.localStorage.getItem(`${APPLYFLOW_DASHBOARD_CONTACTS_STORAGE_KEY}::${ACCOUNT_A}`),
    ).toBeNull();
  });

  it("fails closed on cloud_read_only instead of writing local", async () => {
    bindPersonalClientScope({ accountId: ACCOUNT_A, authority: "cloud_read" });
    const result = await applyOpportunityPipeline(pipelineDoc());
    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ error: "cloud_read_only" });
    expect(window.localStorage.getItem(APPLYFLOW_DASHBOARD_JOBS_STORAGE_KEY)).toBeNull();
  });
});
