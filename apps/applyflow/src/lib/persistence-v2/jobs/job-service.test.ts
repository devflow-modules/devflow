import { hashJobDescription } from "@devflow/applyflow-core";
import { describe, expect, it } from "vitest";

import type { ApplyFlowJobRepository } from "../repositories";
import { parseCreateJobBody, parseJobIfMatch, parsePatchJobBody } from "./job-dto";
import { ApplyFlowJobServiceError } from "./job-errors";
import { createApplyFlowJobService } from "./job-service";

const ACCOUNT_A = "account-a";
const ACCOUNT_B = "account-b";

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    title: "Product Engineer",
    source: "paste",
    status: "reviewing",
    url: "https://Jobs.Example.com/acme/role/",
    descriptionSnapshot: "React TypeScript",
    jobContext: { skills: [" React ", ""] },
    jobMatch: {
      score: 80,
      decision: "apply",
      matchedSkills: ["React"],
      missingSkills: [],
      evaluatedAt: "2026-09-25T12:00:00.000Z",
      scoringVersion: "v1",
    },
    ...overrides,
  };
}

type Stored = Awaited<ReturnType<ApplyFlowJobRepository["create"]>>;

function memoryRepository() {
  const rows: Stored[] = [];
  const repository = {
    async create(input: Parameters<ApplyFlowJobRepository["create"]>[0]) {
      if (rows.some((row) => row.accountId === input.accountId && row.id === input.id)) {
        const error = new Error("unique");
        Object.assign(error, { code: "P2002" });
        throw error;
      }
      const now = new Date("2026-09-25T12:00:00.000Z");
      const record = {
        accountId: input.accountId,
        id: input.id,
        title: input.title,
        company: input.company ?? null,
        location: input.location ?? null,
        url: input.url ?? null,
        canonicalUrl: input.canonicalUrl ?? null,
        source: input.source,
        status: input.status,
        jobContext: input.jobContext,
        descriptionSnapshot: input.descriptionSnapshot ?? null,
        descriptionHash: input.descriptionHash ?? null,
        jobMatch: input.jobMatch,
        evaluatedWith: input.evaluatedWith ?? null,
        curriculumRecommendation: input.curriculumRecommendation ?? null,
        applicationPack: input.applicationPack ?? null,
        version: 1,
        createdAt: now,
        updatedAt: now,
      } as Stored;
      rows.push(record);
      return record;
    },
    async findById(accountId: string, id: string) {
      return rows.find((row) => row.accountId === accountId && row.id === id) ?? null;
    },
    async list(accountId: string) {
      return rows.filter((row) => row.accountId === accountId);
    },
    async updateWithVersion(
      accountId: string,
      id: string,
      expectedVersion: number,
      patch: Parameters<ApplyFlowJobRepository["updateWithVersion"]>[3],
    ) {
      const row = rows.find((item) => item.accountId === accountId && item.id === id);
      if (!row) return { ok: false as const, reason: "not_found" as const };
      if (row.version !== expectedVersion) return { ok: false as const, reason: "conflict" as const };
      Object.assign(row, patch, {
        version: row.version + 1,
        updatedAt: new Date(row.updatedAt.getTime() + 1000),
      });
      return { ok: true as const, record: row };
    },
  };
  return { rows, repository: repository as unknown as ApplyFlowJobRepository };
}

describe("Jobs DTO", () => {
  it("rejects unknown fields, accountId, and derived values", () => {
    expect(() => parseCreateJobBody(validBody({ accountId: ACCOUNT_A }))).toThrow(ApplyFlowJobServiceError);
    expect(() => parseCreateJobBody(validBody({ canonicalUrl: "https://example.com" }))).toThrow(
      ApplyFlowJobServiceError,
    );
    expect(() => parseCreateJobBody(validBody({ descriptionHash: "deadbeef" }))).toThrow(ApplyFlowJobServiceError);
    expect(() => parseCreateJobBody(validBody({ source: "fax" }))).toThrow(ApplyFlowJobServiceError);
    expect(() => parseCreateJobBody(validBody({ title: "x".repeat(201) }))).toThrow(ApplyFlowJobServiceError);
  });

  it("rejects an empty patch and identity mutation", () => {
    expect(() => parsePatchJobBody({})).toThrow(ApplyFlowJobServiceError);
    try {
      parsePatchJobBody({});
    } catch (error) {
      expect(error).toMatchObject({ code: "empty_patch" });
    }
    expect(() => parsePatchJobBody({ id: "job_other", title: "Next" })).toThrow(ApplyFlowJobServiceError);
    expect(() => parsePatchJobBody({ accountId: ACCOUNT_B, title: "Next" })).toThrow(ApplyFlowJobServiceError);
  });

  it("accepts only a quoted positive If-Match version", () => {
    expect(parseJobIfMatch('"3"')).toBe(3);
    expect(() => parseJobIfMatch(null)).toThrow(ApplyFlowJobServiceError);
    expect(() => parseJobIfMatch("3")).toThrow(ApplyFlowJobServiceError);
    expect(() => parseJobIfMatch('"0"')).toThrow(ApplyFlowJobServiceError);
    expect(() => parseJobIfMatch('"1", "2"')).toThrow(ApplyFlowJobServiceError);
  });
});

describe("Jobs service", () => {
  it("preserves a client id and derives canonical URL and description hash", async () => {
    const { repository } = memoryRepository();
    const service = createApplyFlowJobService(repository);
    const created = await service.create(ACCOUNT_A, parseCreateJobBody(validBody({ id: "job_client_fixed" })));
    expect(created.id).toBe("job_client_fixed");
    expect(created.version).toBe(1);
    expect(created.canonicalUrl).toBe("https://jobs.example.com/acme/role");
    expect(created.descriptionHash).toBe(hashJobDescription("React TypeScript"));
    expect(created.jobContext.skills).toEqual(["React"]);
    expect(created).not.toHaveProperty("accountId");
  });

  it("generates a V1 job id when the client omits one", async () => {
    const { repository } = memoryRepository();
    const service = createApplyFlowJobService(repository);
    const created = await service.create(ACCOUNT_A, parseCreateJobBody(validBody()));
    expect(created.id).toMatch(/^job_[0-9a-z]+_[0-9a-z]+$/);
  });

  it("returns 409 semantics when the canonical id already exists", async () => {
    const { repository } = memoryRepository();
    const service = createApplyFlowJobService(repository);
    await service.create(ACCOUNT_A, parseCreateJobBody(validBody({ id: "job_same" })));
    await expect(service.create(ACCOUNT_A, parseCreateJobBody(validBody({ id: "job_same" })))).rejects.toMatchObject({
      code: "job_already_exists",
    });
  });

  it("maps a unique violation to job_already_exists when the pre-check races", async () => {
    const { repository } = memoryRepository();
    const originalFind = repository.findById.bind(repository);
    repository.findById = async () => null;
    const service = createApplyFlowJobService(repository);
    await originalFind(ACCOUNT_A, "missing");
    const created = await repository.create({
      accountId: ACCOUNT_A,
      id: "job_race",
      title: "Existing",
      source: "paste",
      status: "reviewing",
      jobContext: { skills: [] },
      jobMatch: { score: 1 },
    });
    expect(created.id).toBe("job_race");
    await expect(service.create(ACCOUNT_A, parseCreateJobBody(validBody({ id: "job_race" })))).rejects.toMatchObject({
      code: "job_already_exists",
    });
  });

  it("lists only the caller account in updatedAt DESC, id ASC order", async () => {
    const { rows, repository } = memoryRepository();
    const service = createApplyFlowJobService(repository);
    await service.create(ACCOUNT_A, parseCreateJobBody(validBody({ id: "job_b" })));
    await service.create(ACCOUNT_A, parseCreateJobBody(validBody({ id: "job_a", title: "A" })));
    await service.create(ACCOUNT_B, parseCreateJobBody(validBody({ id: "job_other" })));
    const newer = rows.find((row) => row.id === "job_a");
    const older = rows.find((row) => row.id === "job_b");
    if (!newer || !older) throw new Error("fixture missing");
    newer.updatedAt = new Date("2026-09-25T15:00:00.000Z");
    older.updatedAt = new Date("2026-09-25T15:00:00.000Z");
    const listed = await service.list(ACCOUNT_A);
    expect(listed.map((job) => job.id)).toEqual(["job_a", "job_b"]);
  });

  it("hides another account's job as not_found", async () => {
    const { repository } = memoryRepository();
    const service = createApplyFlowJobService(repository);
    await service.create(ACCOUNT_A, parseCreateJobBody(validBody({ id: "job_private" })));
    await expect(service.get(ACCOUNT_B, "job_private")).rejects.toMatchObject({ code: "not_found" });
  });

  it("increments version and rejects a stale If-Match version", async () => {
    const { repository } = memoryRepository();
    const service = createApplyFlowJobService(repository);
    await service.create(ACCOUNT_A, parseCreateJobBody(validBody({ id: "job_patch" })));
    const updated = await service.patch(ACCOUNT_A, "job_patch", 1, parsePatchJobBody({ title: "Updated title" }));
    expect(updated.version).toBe(2);
    expect(updated.title).toBe("Updated title");
    await expect(
      service.patch(ACCOUNT_A, "job_patch", 1, parsePatchJobBody({ title: "Stale" })),
    ).rejects.toMatchObject({ code: "version_conflict" });
    const current = await service.get(ACCOUNT_A, "job_patch");
    expect(current.title).toBe("Updated title");
    expect(current.version).toBe(2);
  });

  it("returns not_found when patching a missing job", async () => {
    const { repository } = memoryRepository();
    const service = createApplyFlowJobService(repository);
    await expect(
      service.patch(ACCOUNT_A, "job_missing", 1, parsePatchJobBody({ title: "Nope" })),
    ).rejects.toMatchObject({ code: "not_found" });
  });
});
