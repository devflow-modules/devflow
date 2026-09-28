import { describe, expect, it } from "vitest";

import type { ApplyFlowApplicationRepository, ApplyFlowJobRepository } from "../repositories";
import { parseCreateApplicationBody, parsePatchApplicationBody } from "./application-dto";
import { applicationErrorResponse } from "./application-http";
import { ApplyFlowApplicationServiceError } from "./application-errors";
import { createApplyFlowApplicationService } from "./application-service";
import {
  classifyApplicationUniqueViolation,
  createMemoryUniqueViolation,
} from "./application-unique-violation";
import { toSourceJobUniquenessPreflightResult } from "./source-job-uniqueness-preflight";

const ACCOUNT_A = "account-a";
const ACCOUNT_B = "account-b";
const NOW = new Date("2026-09-28T12:00:00.000Z");

type AppRow = Awaited<ReturnType<ApplyFlowApplicationRepository["create"]>>;
type JobRow = Awaited<ReturnType<ApplyFlowJobRepository["create"]>>;

/**
 * MEMORY harness that can reproduce the original TOCTOU race:
 * T1 check → T2 check → T1 insert → T2 insert
 * by holding findBySourceJobId until both have observed empty.
 */
function memoryWithRaceGate(options?: { gateChecks?: boolean }) {
  const applications: AppRow[] = [];
  const jobs: JobRow[] = [];
  let checkBarrier: { resolve: () => void; promise: Promise<void>; remaining: number } | null = null;

  function armCheckBarrier(concurrency: number) {
    let resolve!: () => void;
    const promise = new Promise<void>((r) => {
      resolve = r;
    });
    checkBarrier = { resolve, promise, remaining: concurrency };
  }

  const applicationRepository = {
    async create(input: Parameters<ApplyFlowApplicationRepository["create"]>[0]) {
      if (applications.some((row) => row.accountId === input.accountId && row.id === input.id)) {
        throw createMemoryUniqueViolation("primary_key");
      }
      const sourceJobId = input.sourceJobId ?? null;
      if (
        sourceJobId &&
        applications.some(
          (row) => row.accountId === input.accountId && row.sourceJobId === sourceJobId,
        )
      ) {
        throw createMemoryUniqueViolation("source_job");
      }
      const record = {
        ...input,
        sourceJobId,
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
      if (options?.gateChecks && checkBarrier) {
        checkBarrier.remaining -= 1;
        if (checkBarrier.remaining <= 0) checkBarrier.resolve();
        await checkBarrier.promise;
      }
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
  };

  return {
    applications,
    jobs,
    armCheckBarrier,
    service: createApplyFlowApplicationService(
      applicationRepository as unknown as ApplyFlowApplicationRepository,
      jobRepository as unknown as ApplyFlowJobRepository,
    ),
  };
}

function seedJob(target: { jobs: JobRow[] }, accountId: string, id: string) {
  target.jobs.push({
    accountId,
    id,
    title: "Role",
    company: "Acme",
    location: null,
    url: "https://example.com/role",
    canonicalUrl: null,
    source: "paste",
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

describe("AF-REL-001 MEMORY — unique violation classification", () => {
  it("differentiates sourceJob unique index from primary key P2002", () => {
    expect(classifyApplicationUniqueViolation(createMemoryUniqueViolation("source_job"))).toBe(
      "source_job",
    );
    expect(classifyApplicationUniqueViolation(createMemoryUniqueViolation("primary_key"))).toBe(
      "primary_key",
    );
    expect(classifyApplicationUniqueViolation(new Error("nope"))).toBeNull();
  });

  it("maps source_job P2002 to HTTP 409 application_already_exists_for_job", async () => {
    const response = applicationErrorResponse(
      new ApplyFlowApplicationServiceError("application_already_exists_for_job"),
    );
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "application_already_exists_for_job" });
  });
});

describe("AF-REL-001 MEMORY — preflight (read-only)", () => {
  it("reports duplicate groups without mutating", () => {
    const result = toSourceJobUniquenessPreflightResult([
      { accountId: ACCOUNT_A, id: "app_1", sourceJobId: "job_x" },
      { accountId: ACCOUNT_A, id: "app_2", sourceJobId: "job_x" },
      { accountId: ACCOUNT_A, id: "app_null_a", sourceJobId: null },
      { accountId: ACCOUNT_A, id: "app_null_b", sourceJobId: null },
      { accountId: ACCOUNT_B, id: "app_b", sourceJobId: "job_x" },
    ]);
    expect(result.mutated).toBe(false);
    expect(result.duplicateGroupCount).toBe(1);
    expect(result.duplicates).toEqual([
      {
        accountId: ACCOUNT_A,
        sourceJobId: "job_x",
        count: 2,
        applicationIds: ["app_1", "app_2"],
      },
    ]);
  });
});

describe("AF-REL-001 MEMORY — sequential + NULL + cross-account", () => {
  it("rejects a second Application for the same job sequentially", async () => {
    const target = memoryWithRaceGate();
    seedJob(target, ACCOUNT_A, "job_1");
    await target.service.create(
      ACCOUNT_A,
      parseCreateApplicationBody({ id: "app_first", sourceJobId: "job_1" }),
      NOW,
    );
    await expect(
      target.service.create(
        ACCOUNT_A,
        parseCreateApplicationBody({ id: "app_second", sourceJobId: "job_1" }),
        NOW,
      ),
    ).rejects.toMatchObject({ code: "application_already_exists_for_job" });
    expect(target.applications.filter((row) => row.sourceJobId === "job_1")).toHaveLength(1);
  });

  it("allows multiple Applications with sourceJobId null", async () => {
    const target = memoryWithRaceGate();
    await target.service.create(
      ACCOUNT_A,
      parseCreateApplicationBody({ id: "app_null_a", jobTitle: "A" }),
      NOW,
    );
    await target.service.create(
      ACCOUNT_A,
      parseCreateApplicationBody({ id: "app_null_b", jobTitle: "B" }),
      NOW,
    );
    expect(target.applications.filter((row) => row.sourceJobId == null)).toHaveLength(2);
  });

  it("allows the same sourceJobId across different accounts", async () => {
    const target = memoryWithRaceGate();
    seedJob(target, ACCOUNT_A, "job_shared");
    seedJob(target, ACCOUNT_B, "job_shared");
    await target.service.create(
      ACCOUNT_A,
      parseCreateApplicationBody({ id: "app_a", sourceJobId: "job_shared" }),
      NOW,
    );
    await target.service.create(
      ACCOUNT_B,
      parseCreateApplicationBody({ id: "app_b", sourceJobId: "job_shared" }),
      NOW,
    );
    expect(target.applications).toHaveLength(2);
  });

  it("does not leak Account A Application to Account B via get", async () => {
    const target = memoryWithRaceGate();
    seedJob(target, ACCOUNT_A, "job_private");
    await target.service.create(
      ACCOUNT_A,
      parseCreateApplicationBody({ id: "app_private", sourceJobId: "job_private" }),
      NOW,
    );
    await expect(target.service.get(ACCOUNT_B, "app_private")).rejects.toMatchObject({
      code: "not_found",
    });
    // Cross-account job id is source_job_not_found (not an existence oracle for Application)
    await expect(
      target.service.create(
        ACCOUNT_B,
        parseCreateApplicationBody({ id: "app_probe", sourceJobId: "job_private" }),
        NOW,
      ),
    ).rejects.toMatchObject({ code: "source_job_not_found" });
  });
});

describe("AF-REL-001 MEMORY — concurrent race (barrier)", () => {
  async function runConcurrency(concurrency: number) {
    const target = memoryWithRaceGate({ gateChecks: true });
    seedJob(target, ACCOUNT_A, "job_race");
    target.armCheckBarrier(concurrency);

    const results = await Promise.allSettled(
      Array.from({ length: concurrency }, (_, index) =>
        target.service.create(
          ACCOUNT_A,
          parseCreateApplicationBody({
            id: `app_race_${index}`,
            sourceJobId: "job_race",
          }),
          NOW,
        ),
      ),
    );

    const successes = results.filter((r) => r.status === "fulfilled");
    const conflicts = results.filter(
      (r) =>
        r.status === "rejected" &&
        r.reason instanceof ApplyFlowApplicationServiceError &&
        r.reason.code === "application_already_exists_for_job",
    );
    const persisted = target.applications.filter((row) => row.sourceJobId === "job_race");

    return { successes, conflicts, persisted, results };
  }

  it("c2: exactly 1 success, 1 conflict, 1 persisted (MEMORY VERIFIED)", async () => {
    const { successes, conflicts, persisted } = await runConcurrency(2);
    expect(successes).toHaveLength(1);
    expect(conflicts).toHaveLength(1);
    expect(persisted).toHaveLength(1);
  });

  for (const concurrency of [5, 10, 20] as const) {
    it(`c${concurrency}: success=1 persisted=1 remaining=stable domain conflicts (MEMORY VERIFIED)`, async () => {
      const { successes, conflicts, persisted, results } = await runConcurrency(concurrency);
      expect(successes).toHaveLength(1);
      expect(persisted).toHaveLength(1);
      expect(conflicts).toHaveLength(concurrency - 1);
      expect(results.every((r) => r.status === "fulfilled" || r.status === "rejected")).toBe(true);
      for (const r of results) {
        if (r.status === "rejected") {
          expect(r.reason).toMatchObject({ code: "application_already_exists_for_job" });
        }
      }
    });
  }

  it("same Application id concurrent: 1 persisted + stable duplicate-id behavior", async () => {
    const target = memoryWithRaceGate({ gateChecks: true });
    seedJob(target, ACCOUNT_A, "job_same_id");
    target.armCheckBarrier(2);

    const results = await Promise.allSettled([
      target.service.create(
        ACCOUNT_A,
        parseCreateApplicationBody({ id: "app_same_id", sourceJobId: "job_same_id" }),
        NOW,
      ),
      target.service.create(
        ACCOUNT_A,
        parseCreateApplicationBody({ id: "app_same_id", sourceJobId: "job_same_id" }),
        NOW,
      ),
    ]);

    const successes = results.filter((r) => r.status === "fulfilled");
    expect(successes).toHaveLength(1);
    expect(target.applications.filter((row) => row.id === "app_same_id")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected");
    expect(rejected).toBeDefined();
    if (rejected && rejected.status === "rejected") {
      expect(["application_already_exists", "application_already_exists_for_job"]).toContain(
        (rejected.reason as ApplyFlowApplicationServiceError).code,
      );
    }
  });
});

describe("AF-REL-001 MEMORY — OCC dual-writer regression", () => {
  it("1 success, 1 version_conflict, monotonic version, no lost update", async () => {
    const target = memoryWithRaceGate();
    await target.service.create(
      ACCOUNT_A,
      parseCreateApplicationBody({ id: "app_occ", notes: "base" }),
      NOW,
    );

    const [a, b] = await Promise.allSettled([
      target.service.patch(
        ACCOUNT_A,
        "app_occ",
        1,
        parsePatchApplicationBody({ notes: "writer-a", expectedVersion: 1 }),
        NOW,
      ),
      target.service.patch(
        ACCOUNT_A,
        "app_occ",
        1,
        parsePatchApplicationBody({ notes: "writer-b", expectedVersion: 1 }),
        NOW,
      ),
    ]);

    const outcomes = [a, b];
    const ok = outcomes.filter((r) => r.status === "fulfilled");
    const conflict = outcomes.filter(
      (r) =>
        r.status === "rejected" &&
        r.reason instanceof ApplyFlowApplicationServiceError &&
        r.reason.code === "version_conflict",
    );
    expect(ok).toHaveLength(1);
    expect(conflict).toHaveLength(1);
    const current = await target.service.get(ACCOUNT_A, "app_occ");
    expect(current.version).toBe(2);
    expect(["writer-a", "writer-b"]).toContain(current.notes);
  });
});
