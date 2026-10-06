import { describe, expect, it, vi } from "vitest";

import {
  assertApplicationReusable,
  assertJobReusable,
  classifyHttp409,
  markCloudApplicationSent,
  pickAccountProfile,
  profileFieldsForContentScript,
  registerCloudJobAndApplication,
} from "./extension-cloud-sync.js";

const ORIGIN = "http://127.0.0.1:3012";
const ACCOUNT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const JOB_URL = "https://www.linkedin.com/jobs/view/1";

function draft() {
  return {
    source: "linkedin" as const,
    jobTitle: "Engineer",
    companyName: "Acme",
    jobUrl: JOB_URL,
    status: "reviewing" as const,
    fitScore: 80,
  };
}

describe("extension-cloud-sync 409 contract", () => {
  it("classifies duplicate, version_conflict, and unknown 409 codes", () => {
    expect(classifyHttp409("job_already_exists")).toBe("duplicate_job");
    expect(classifyHttp409("application_already_exists")).toBe("duplicate_application");
    expect(classifyHttp409("application_already_exists_for_job")).toBe("duplicate_application");
    expect(classifyHttp409("version_conflict")).toBe("version_conflict");
    expect(classifyHttp409("something_else")).toBe("unknown");
  });

  it("rejects incompatible job/application reuse", () => {
    expect(
      assertJobReusable(
        { jobId: "extjob_1", jobUrl: JOB_URL },
        { id: "extjob_1", url: "https://www.linkedin.com/jobs/view/other" },
      ),
    ).toEqual({ ok: false, error: "conflict_incompatible", status: 409 });

    expect(
      assertApplicationReusable(
        { applicationId: "extapp_1", jobId: "extjob_1", jobUrl: JOB_URL },
        { id: "extapp_1", version: 2, sourceJobId: "extjob_other", jobUrl: JOB_URL },
      ),
    ).toEqual({ ok: false, error: "conflict_incompatible", status: 409 });
  });

  it("reuses duplicates only after authenticated GET confirms identity", async () => {
    let postedJobId = "";
    let postedAppId = "";
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const headers = init?.headers as Record<string, string> | undefined;
      expect(headers?.Authorization).toMatch(/^Bearer /);

      if (url.endsWith("/jobs") && init?.method === "POST") {
        postedJobId = (JSON.parse(String(init.body)) as { id: string }).id;
        return new Response(JSON.stringify({ error: "job_already_exists" }), { status: 409 });
      }
      if (url.includes(`/jobs/${postedJobId}`) && (!init?.method || init.method === "GET")) {
        return new Response(JSON.stringify({ id: postedJobId, url: JOB_URL, version: 1 }), { status: 200 });
      }
      if (url.endsWith("/applications") && init?.method === "POST") {
        postedAppId = (JSON.parse(String(init.body)) as { id: string }).id;
        return new Response(JSON.stringify({ error: "application_already_exists" }), { status: 409 });
      }
      if (url.includes(`/applications/${postedAppId}`) && (!init?.method || init.method === "GET")) {
        return new Response(
          JSON.stringify({
            id: postedAppId,
            version: 3,
            sourceJobId: postedJobId,
            jobUrl: JOB_URL,
          }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({ error: "unexpected" }), { status: 500 });
    });

    const result = await registerCloudJobAndApplication({
      origin: ORIGIN,
      token: "a".repeat(64),
      accountId: ACCOUNT,
      draft: draft(),
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.reused).toBe(true);
      expect(result.applicationId).toBe(postedAppId);
      expect(result.applicationVersion).toBe(3);
      expect(result.jobId).toBe(postedJobId);
    }
  });

  it("fails incompatible duplicate job without treating 409 as success", async () => {
    let postedJobId = "";
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/jobs") && init?.method === "POST") {
        postedJobId = (JSON.parse(String(init.body)) as { id: string }).id;
        return new Response(JSON.stringify({ error: "job_already_exists" }), { status: 409 });
      }
      if (url.includes(`/jobs/${postedJobId}`)) {
        return new Response(
          JSON.stringify({ id: postedJobId, url: "https://www.linkedin.com/jobs/view/mismatch", version: 1 }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({ error: "unexpected" }), { status: 500 });
    });

    const result = await registerCloudJobAndApplication({
      origin: ORIGIN,
      token: "a".repeat(64),
      accountId: ACCOUNT,
      draft: draft(),
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result).toEqual({ ok: false, error: "conflict_incompatible", status: 409 });
  });

  it("does not treat version_conflict as reuse/success", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/jobs") && init?.method === "POST") {
        return new Response(JSON.stringify({ error: "version_conflict" }), { status: 409 });
      }
      return new Response(JSON.stringify({ error: "unexpected" }), { status: 500 });
    });

    const result = await registerCloudJobAndApplication({
      origin: ORIGIN,
      token: "a".repeat(64),
      accountId: ACCOUNT,
      draft: draft(),
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result).toEqual({ ok: false, error: "version_conflict", status: 409 });
  });

  it("fails unknown 409 codes explicitly", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(JSON.stringify({ error: "weird_conflict" }), { status: 409 });
    });

    const result = await registerCloudJobAndApplication({
      origin: ORIGIN,
      token: "a".repeat(64),
      accountId: ACCOUNT,
      draft: draft(),
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result).toEqual({ ok: false, error: "conflict_unknown", status: 409 });
  });

  it("reconciles by stable ids after a lost create response", async () => {
    let postedJobId = "";
    let postedAppId = "";
    let jobPosts = 0;
    let appPosts = 0;
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/jobs") && init?.method === "POST") {
        jobPosts += 1;
        postedJobId = (JSON.parse(String(init.body)) as { id: string }).id;
        throw new TypeError("network");
      }
      if (url.includes(`/jobs/`) && (!init?.method || init.method === "GET")) {
        return new Response(JSON.stringify({ id: postedJobId, url: JOB_URL, version: 1 }), { status: 200 });
      }
      if (url.endsWith("/applications") && init?.method === "POST") {
        appPosts += 1;
        postedAppId = (JSON.parse(String(init.body)) as { id: string }).id;
        throw new TypeError("network");
      }
      if (url.includes(`/applications/`) && (!init?.method || init.method === "GET")) {
        return new Response(
          JSON.stringify({
            id: postedAppId,
            version: 1,
            sourceJobId: postedJobId,
            jobUrl: JOB_URL,
          }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({ error: "unexpected" }), { status: 500 });
    });

    const result = await registerCloudJobAndApplication({
      origin: ORIGIN,
      token: "a".repeat(64),
      accountId: ACCOUNT,
      draft: draft(),
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(jobPosts).toBe(1);
    expect(appPosts).toBe(1);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.reused).toBe(true);
      expect(result.jobId).toBe(postedJobId);
      expect(result.applicationId).toBe(postedAppId);
    }
  });

  it("surfaces lifecycle version_conflict without overwrite", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(JSON.stringify({ error: "version_conflict" }), { status: 409 });
    });
    const result = await markCloudApplicationSent({
      origin: ORIGIN,
      token: "a".repeat(64),
      applicationId: "extapp_1",
      expectedVersion: 1,
      confirmedExternalSubmit: true,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result).toEqual({ ok: false, error: "version_conflict", status: 409 });
  });

  it("requires explicit external submit confirmation", async () => {
    const result = await markCloudApplicationSent({
      origin: ORIGIN,
      token: "a".repeat(64),
      applicationId: "extapp_1",
      expectedVersion: 1,
      confirmedExternalSubmit: false,
    });
    expect(result).toEqual({ ok: false, error: "external_submit_not_confirmed", status: 400 });
  });

  it("picks the preferred resume variant for assistance", () => {
    const library = {
      version: 1 as const,
      defaultVariantId: "v1",
      variants: [
        {
          id: "v1",
          name: "Principal",
          profile: { name: "A" } as never,
          isDefault: true,
          source: "manual" as const,
          createdAt: "2026-10-05T12:00:00.000Z",
          updatedAt: "2026-10-05T12:00:00.000Z",
        },
        {
          id: "v2",
          name: "Alt",
          profile: { name: "B" } as never,
          isDefault: false,
          source: "manual" as const,
          createdAt: "2026-10-05T12:00:00.000Z",
          updatedAt: "2026-10-05T12:00:00.000Z",
        },
      ],
    };
    const picked = pickAccountProfile(library, "v2");
    expect(picked?.selectedVariantId).toBe("v2");
    expect(profileFieldsForContentScript(picked!.profile).name).toBe("B");
  });
});
