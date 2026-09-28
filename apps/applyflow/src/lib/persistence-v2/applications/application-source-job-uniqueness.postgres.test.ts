/**
 * AF-REL-001 PostgreSQL verification (ephemeral / local Docker only).
 *
 * Label: POSTGRES VERIFIED when this file runs green against localhost:5434.
 * Skips automatically when DATABASE_URL is missing or db-target-guard denies.
 *
 * Never targets Production. Synthetic fixtures are deleted in afterAll.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

import {
  assertApplyFlowDestructiveDbTargetAllowed,
  classifyApplyFlowDbTarget,
} from "../db-target-guard";
import { createApplyFlowApplicationRepository } from "../repositories/applications-repository";
import { createApplyFlowJobRepository } from "../repositories/jobs-repository";
import { createApplyFlowApplicationService } from "./application-service";
import { ApplyFlowApplicationServiceError } from "./application-errors";
import { parseCreateApplicationBody } from "./application-dto";
import { runSourceJobUniquenessPreflight } from "./source-job-uniqueness-preflight";

const LOCAL_URL =
  process.env.APPLYFLOW_R1_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "postgresql://applyflow:applyflow_local_dev@localhost:5434/applyflow";

const classification = classifyApplyFlowDbTarget({
  DATABASE_URL: LOCAL_URL,
  DIRECT_URL: LOCAL_URL,
  APPLYFLOW_DB_TARGET: "local",
});

const postgresAvailable = classification.allowedForDestructiveTests;

const describePostgres = postgresAvailable ? describe : describe.skip;

describePostgres("AF-REL-001 POSTGRES — DB-enforced uniqueness under concurrency", () => {
  const prisma = new PrismaClient({
    datasources: { db: { url: LOCAL_URL } },
  });
  const appsRepo = createApplyFlowApplicationRepository(prisma as never);
  const jobsRepo = createApplyFlowJobRepository(prisma as never);
  const service = createApplyFlowApplicationService(appsRepo, jobsRepo);

  const fixtureAccountIds: string[] = [];
  const NOW = new Date("2026-09-28T15:00:00.000Z");

  async function createFixtureAccount(): Promise<string> {
    const id = randomUUID();
    await prisma.applyFlowAccount.create({
      data: {
        id,
        authProviderSub: `r1-test-${id}`,
        email: null,
      },
    });
    fixtureAccountIds.push(id);
    return id;
  }

  beforeAll(async () => {
    assertApplyFlowDestructiveDbTargetAllowed({
      DATABASE_URL: LOCAL_URL,
      DIRECT_URL: LOCAL_URL,
      APPLYFLOW_DB_TARGET: "local",
    });

    const indexes = await prisma.$queryRawUnsafe<Array<{ indexname: string }>>(
      `SELECT indexname FROM pg_indexes WHERE tablename = 'applyflow_applications' AND indexname = 'applyflow_applications_account_id_source_job_id_uidx'`,
    );
    if (indexes.length === 0) {
      throw new Error(
        "AF-REL-001 unique index missing — run migrate deploy against local Docker before POSTGRES tests.",
      );
    }
  });

  afterAll(async () => {
    try {
      for (const accountId of fixtureAccountIds) {
        await prisma.applyFlowApplication.deleteMany({ where: { accountId } });
        await prisma.applyFlowJob.deleteMany({ where: { accountId } });
        await prisma.applyFlowAccount.delete({ where: { id: accountId } });
      }
    } finally {
      await prisma.$disconnect();
    }
  });

  it("preflight detects synthetic duplicates without mutating", async () => {
    assertApplyFlowDestructiveDbTargetAllowed({
      DATABASE_URL: LOCAL_URL,
      DIRECT_URL: LOCAL_URL,
      APPLYFLOW_DB_TARGET: "local",
    });

    const accountId = await createFixtureAccount();
    await prisma.applyFlowJob.create({
      data: {
        accountId,
        id: "job_dup_seed",
        title: "DupSeed",
        source: "paste",
        status: "reviewing",
        jobContext: {},
        jobMatch: {},
      },
    });

    // Temporarily relax uniqueness ONLY on safe_local to seed the preflight fixture.
    await prisma.$executeRawUnsafe(
      `DROP INDEX IF EXISTS "applyflow_applications_account_id_source_job_id_uidx"`,
    );
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO applyflow_applications (account_id, id, source_job_id, source, status, version, created_at, updated_at)
         VALUES ($1::uuid, 'app_dup_a', 'job_dup_seed', 'paste', 'reviewing', 1, NOW(), NOW()),
                ($1::uuid, 'app_dup_b', 'job_dup_seed', 'paste', 'reviewing', 1, NOW(), NOW())`,
        accountId,
      );

      const result = await runSourceJobUniquenessPreflight(prisma);
      expect(result.mutated).toBe(false);
      const group = result.duplicates.find(
        (d) => d.accountId === accountId && d.sourceJobId === "job_dup_seed",
      );
      expect(group?.count).toBe(2);
      expect(group?.applicationIds.sort()).toEqual(["app_dup_a", "app_dup_b"]);

      await prisma.applyFlowApplication.deleteMany({
        where: { accountId, id: { in: ["app_dup_a", "app_dup_b"] } },
      });
    } finally {
      await prisma.$executeRawUnsafe(
        `CREATE UNIQUE INDEX IF NOT EXISTS "applyflow_applications_account_id_source_job_id_uidx"
         ON "applyflow_applications" ("account_id", "source_job_id")
         WHERE "source_job_id" IS NOT NULL`,
      );
    }
  });

  it("allows multiple NULL sourceJobId for the same account", async () => {
    const accountId = await createFixtureAccount();
    await service.create(
      accountId,
      parseCreateApplicationBody({ id: "app_null_1", jobTitle: "N1" }),
      NOW,
    );
    await service.create(
      accountId,
      parseCreateApplicationBody({ id: "app_null_2", jobTitle: "N2" }),
      NOW,
    );
    const rows = await prisma.applyFlowApplication.findMany({
      where: { accountId, sourceJobId: null },
    });
    expect(rows).toHaveLength(2);
  });

  it("allows same sourceJobId across accounts", async () => {
    const accountA = await createFixtureAccount();
    const accountB = await createFixtureAccount();
    for (const accountId of [accountA, accountB]) {
      await prisma.applyFlowJob.create({
        data: {
          accountId,
          id: "job_cross",
          title: "Cross",
          source: "paste",
          status: "reviewing",
          jobContext: {},
          jobMatch: {},
        },
      });
    }
    await service.create(
      accountA,
      parseCreateApplicationBody({ id: "app_cross_a", sourceJobId: "job_cross" }),
      NOW,
    );
    await service.create(
      accountB,
      parseCreateApplicationBody({ id: "app_cross_b", sourceJobId: "job_cross" }),
      NOW,
    );
    const count = await prisma.applyFlowApplication.count({
      where: { sourceJobId: "job_cross", accountId: { in: [accountA, accountB] } },
    });
    expect(count).toBe(2);
  });

  async function runRace(concurrency: number) {
    const accountId = await createFixtureAccount();
    await prisma.applyFlowJob.create({
      data: {
        accountId,
        id: "job_race",
        title: "Race",
        source: "paste",
        status: "reviewing",
        jobContext: {},
        jobMatch: {},
      },
    });

    const results = await Promise.allSettled(
      Array.from({ length: concurrency }, (_, index) =>
        service.create(
          accountId,
          parseCreateApplicationBody({
            id: `app_race_${concurrency}_${index}`,
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
    const persisted = await prisma.applyFlowApplication.count({
      where: { accountId, sourceJobId: "job_race" },
    });
    return { successes, conflicts, persisted, results };
  }

  for (const concurrency of [2, 5, 10, 20] as const) {
    it(`c${concurrency}: exactly 1 persisted under concurrent inserts (DB-enforced uniqueness)`, async () => {
      const { successes, conflicts, persisted, results } = await runRace(concurrency);
      expect(persisted).toBe(1);
      expect(successes).toHaveLength(1);
      expect(conflicts).toHaveLength(concurrency - 1);
      for (const r of results) {
        if (r.status === "rejected") {
          expect(r.reason).toMatchObject({ code: "application_already_exists_for_job" });
        }
      }
    });
  }

  it("repository-only concurrent creates: DB unique wins without service pre-check", async () => {
    const accountId = await createFixtureAccount();
    await prisma.applyFlowJob.create({
      data: {
        accountId,
        id: "job_repo_race",
        title: "RepoRace",
        source: "paste",
        status: "reviewing",
        jobContext: {},
        jobMatch: {},
      },
    });

    const results = await Promise.allSettled(
      Array.from({ length: 10 }, (_, index) =>
        appsRepo.create({
          accountId,
          id: `app_repo_race_${index}`,
          sourceJobId: "job_repo_race",
          source: "paste",
          status: "reviewing",
        }),
      ),
    );

    const successes = results.filter((r) => r.status === "fulfilled");
    const uniqueFails = results.filter(
      (r) => r.status === "rejected" && (r.reason as { code?: string })?.code === "P2002",
    );
    const persisted = await prisma.applyFlowApplication.count({
      where: { accountId, sourceJobId: "job_repo_race" },
    });
    expect(persisted).toBe(1);
    expect(successes).toHaveLength(1);
    expect(uniqueFails).toHaveLength(9);
  });
});

if (!postgresAvailable) {
  describe("AF-REL-001 POSTGRES — blocked", () => {
    it("documents POSTGRES VERIFICATION BLOCKED when target is not safe_local", () => {
      expect(classification.allowedForDestructiveTests).toBe(false);
    });
  });
}
