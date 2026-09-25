import { describe, expect, it } from "vitest";

import type { ApplyFlowApplicationRepository, ApplyFlowJobRepository } from "../repositories";
import { parseCreateApplicationBody, parsePatchApplicationBody } from "./application-dto";
import { ApplyFlowApplicationServiceError } from "./application-errors";
import { createApplyFlowApplicationService } from "./application-service";

const ACCOUNT_A = "account-a";
const ACCOUNT_B = "account-b";
const NOW = new Date("2026-09-25T15:00:00.000Z");

type AppRow = Awaited<ReturnType<ApplyFlowApplicationRepository["create"]>>;
type JobRow = Awaited<ReturnType<ApplyFlowJobRepository["create"]>>;

function memory() {
  const applications: AppRow[] = [];
  const jobs: JobRow[] = [];
  const applicationRepository = {
    async create(input: Parameters<ApplyFlowApplicationRepository["create"]>[0]) {
      if (applications.some((row) => row.accountId === input.accountId && row.id === input.id)) {
        const error = new Error("unique");
        Object.assign(error, { code: "P2002" });
        throw error;
      }
      const record = {
        ...input,
        sourceJobId: input.sourceJobId ?? null,
        jobTitle: input.jobTitle ?? null,
        companyName: input.companyName ?? null,
        jobUrl: input.jobUrl ?? null,
        fitScore: input.fitScore ?? null,
        notes: input.notes ?? null,
        jobMeta: input.jobMeta ?? null,
        v2Meta: input.v2Meta ?? null,
        extras: input.extras ?? null,
        appliedAt: input.appliedAt ?? null,
        version: 1,
        createdAt: NOW,
        updatedAt: NOW,
      } as AppRow;
      applications.push(record);
      return record;
    },
    async findById(accountId: string, id: string) {
      return applications.find((row) => row.accountId === accountId && row.id === id) ?? null;
    },
    async list(accountId: string) {
      return applications.filter((row) => row.accountId === accountId);
    },
    async findBySourceJobId(accountId: string, sourceJobId: string) {
      return applications.filter((row) => row.accountId === accountId && row.sourceJobId === sourceJobId);
    },
    async updateWithVersion(
      accountId: string,
      id: string,
      expectedVersion: number,
      patch: Parameters<ApplyFlowApplicationRepository["updateWithVersion"]>[3],
    ) {
      const row = applications.find((item) => item.accountId === accountId && item.id === id);
      if (!row) return { ok: false as const, reason: "not_found" as const };
      if (row.version !== expectedVersion) return { ok: false as const, reason: "conflict" as const };
      Object.assign(row, patch, { version: row.version + 1, updatedAt: new Date(NOW.getTime() + 1000) });
      return { ok: true as const, record: row };
    },
  };
  const jobRepository = {
    async findById(accountId: string, id: string) {
      return jobs.find((row) => row.accountId === accountId && row.id === id) ?? null;
    },
    async create(input: Parameters<ApplyFlowJobRepository["create"]>[0]) {
      const record = {
        ...input,
        company: input.company ?? null,
        location: null,
        url: input.url ?? null,
        canonicalUrl: null,
        descriptionSnapshot: null,
        descriptionHash: null,
        evaluatedWith: null,
        curriculumRecommendation: null,
        applicationPack: null,
        version: 1,
        createdAt: NOW,
        updatedAt: NOW,
      } as JobRow;
      jobs.push(record);
      return record;
    },
  };
  return {
    applications,
    jobs,
    service: createApplyFlowApplicationService(
      applicationRepository as unknown as ApplyFlowApplicationRepository,
      jobRepository as unknown as ApplyFlowJobRepository,
    ),
  };
}

async function seedJob(target: ReturnType<typeof memory>, accountId: string, id: string, source = "paste") {
  await target.jobRepositoryWait?.();
  target.jobs.push({
    accountId,
    id,
    title: "Role",
    company: "Acme",
    location: null,
    url: "https://example.com/role",
    canonicalUrl: null,
    source,
    status: "reviewing",
    jobContext: { skills: [] },
    descriptionSnapshot: null,
    descriptionHash: null,
    jobMatch: {},
    evaluatedWith: null,
    curriculumRecommendation: null,
    applicationPack: null,
    version: 1,
    createdAt: NOW,
    updatedAt: NOW,
  } as JobRow);
}

describe("Application DTO", () => {
  it("rejects account ownership, version, and unknown extras keys", () => {
    expect(() => parseCreateApplicationBody({ accountId: ACCOUNT_A, jobTitle: "Role" })).toThrow(
      ApplyFlowApplicationServiceError,
    );
    expect(() => parseCreateApplicationBody({ version: 2, jobTitle: "Role" })).toThrow(ApplyFlowApplicationServiceError);
    expect(() => parseCreateApplicationBody({ extras: { id: "nope" } })).toThrow(ApplyFlowApplicationServiceError);
    expect(() => parsePatchApplicationBody({})).toThrow(ApplyFlowApplicationServiceError);
  });
});

describe("Application service", () => {
  it("creates a standalone application and preserves a client id", async () => {
    const { service } = memory();
    const created = await service.create(
      ACCOUNT_A,
      parseCreateApplicationBody({
        id: "11111111-1111-4111-8111-111111111111",
        jobTitle: "Standalone",
        source: "linkedin",
      }),
      NOW,
    );
    expect(created.id).toBe("11111111-1111-4111-8111-111111111111");
    expect(created.sourceJobId).toBeNull();
    expect(created.status).toBe("reviewing");
    expect(created.appliedAt).toBeNull();
    expect(created).not.toHaveProperty("accountId");
  });

  it("generates an application id with the existing helper when id is omitted", async () => {
    const { service } = memory();
    const standalone = await service.create(ACCOUNT_A, parseCreateApplicationBody({ jobTitle: "Solo" }), NOW);
    expect(standalone.id).toMatch(/^app_[0-9a-z]+_standalone$/);
  });

  it("returns 409 when the canonical application id already exists", async () => {
    const { service } = memory();
    await service.create(ACCOUNT_A, parseCreateApplicationBody({ id: "app_same", jobTitle: "A" }), NOW);
    await expect(
      service.create(ACCOUNT_A, parseCreateApplicationBody({ id: "app_same", jobTitle: "B" }), NOW),
    ).rejects.toMatchObject({ code: "application_already_exists" });
  });

  it("creates from a same-account job and rejects a sequential second application", async () => {
    const target = memory();
    await seedJob(target, ACCOUNT_A, "job_1", "json");
    const created = await target.service.create(
      ACCOUNT_A,
      parseCreateApplicationBody({ sourceJobId: "job_1" }),
      NOW,
    );
    expect(created.id).toMatch(/^app_[0-9a-z]+_job_1$/);
    expect(created.source).toBe("json");
    expect(created.sourceJobId).toBe("job_1");
    expect(created.jobTitle).toBe("Role");
    expect(created.companyName).toBe("Acme");
    expect(created.jobUrl).toBe("https://example.com/role");
    await expect(
      target.service.create(ACCOUNT_A, parseCreateApplicationBody({ id: "app_second", sourceJobId: "job_1" }), NOW),
    ).rejects.toMatchObject({ code: "application_already_exists_for_job" });
    expect(target.applications.filter((row) => row.sourceJobId === "job_1")).toHaveLength(1);
  });

  it("treats a missing or cross-account job as source_job_not_found", async () => {
    const target = memory();
    await seedJob(target, ACCOUNT_B, "job_other");
    await expect(
      target.service.create(ACCOUNT_A, parseCreateApplicationBody({ sourceJobId: "job_missing" }), NOW),
    ).rejects.toMatchObject({ code: "source_job_not_found" });
    await expect(
      target.service.create(ACCOUNT_A, parseCreateApplicationBody({ sourceJobId: "job_other" }), NOW),
    ).rejects.toMatchObject({ code: "source_job_not_found" });
  });

  it("lists only the caller account in updatedAt DESC, id ASC order", async () => {
    const target = memory();
    await target.service.create(ACCOUNT_A, parseCreateApplicationBody({ id: "app_b" }), NOW);
    await target.service.create(ACCOUNT_A, parseCreateApplicationBody({ id: "app_a" }), NOW);
    await target.service.create(ACCOUNT_B, parseCreateApplicationBody({ id: "app_other" }), NOW);
    const listed = await target.service.list(ACCOUNT_A);
    expect(listed.map((item) => item.id)).toEqual(["app_a", "app_b"]);
  });

  it("hides another account application as not_found", async () => {
    const target = memory();
    await target.service.create(ACCOUNT_A, parseCreateApplicationBody({ id: "app_private" }), NOW);
    await expect(target.service.get(ACCOUNT_B, "app_private")).rejects.toMatchObject({ code: "not_found" });
  });

  it("sets appliedAt when status becomes applied and does not overwrite it", async () => {
    const target = memory();
    await target.service.create(ACCOUNT_A, parseCreateApplicationBody({ id: "app_apply", status: "reviewing" }), NOW);
    const updated = await target.service.patch(
      ACCOUNT_A,
      "app_apply",
      1,
      parsePatchApplicationBody({ status: "applied" }),
      NOW,
    );
    expect(updated.status).toBe("applied");
    expect(updated.appliedAt).toBe(NOW.toISOString());
    expect(updated.version).toBe(2);
    await expect(
      target.service.patch(
        ACCOUNT_A,
        "app_apply",
        2,
        parsePatchApplicationBody({ appliedAt: "2026-01-01T00:00:00.000Z" }),
        NOW,
      ),
    ).rejects.toMatchObject({ code: "invalid_payload" });
  });

  it("rejects an illegal V1 status transition and a sourceJobId relink", async () => {
    const target = memory();
    await seedJob(target, ACCOUNT_A, "job_a");
    await seedJob(target, ACCOUNT_A, "job_b");
    await target.service.create(ACCOUNT_A, parseCreateApplicationBody({ id: "app_flow", sourceJobId: "job_a" }), NOW);
    await expect(
      target.service.patch(ACCOUNT_A, "app_flow", 1, parsePatchApplicationBody({ status: "interview" }), NOW),
    ).rejects.toMatchObject({ code: "invalid_status_transition" });
    await expect(
      target.service.patch(ACCOUNT_A, "app_flow", 1, parsePatchApplicationBody({ sourceJobId: "job_b" }), NOW),
    ).rejects.toMatchObject({ code: "invalid_payload" });
    const current = await target.service.get(ACCOUNT_A, "app_flow");
    expect(current.status).toBe("reviewing");
    expect(current.sourceJobId).toBe("job_a");
    expect(current.version).toBe(1);
  });

  it("increments version and rejects a stale update or a missing application", async () => {
    const target = memory();
    await target.service.create(ACCOUNT_A, parseCreateApplicationBody({ id: "app_patch", notes: "a" }), NOW);
    const updated = await target.service.patch(
      ACCOUNT_A,
      "app_patch",
      1,
      parsePatchApplicationBody({ notes: "updated" }),
      NOW,
    );
    expect(updated.version).toBe(2);
    await expect(
      target.service.patch(ACCOUNT_A, "app_patch", 1, parsePatchApplicationBody({ notes: "stale" }), NOW),
    ).rejects.toMatchObject({ code: "version_conflict" });
    await expect(
      target.service.patch(ACCOUNT_A, "app_missing", 1, parsePatchApplicationBody({ notes: "nope" }), NOW),
    ).rejects.toMatchObject({ code: "not_found" });
  });
});
