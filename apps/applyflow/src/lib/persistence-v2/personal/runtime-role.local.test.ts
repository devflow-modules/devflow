/**
 * Local-only: exercise personal + lifecycle services through the least-privilege
 * applyflow_runtime role (Contract A: BYPASSRLS for Prisma, isolation in the API).
 */
import { randomUUID } from "node:crypto";

import { createResumeLibraryFromProfile, gustavoProfile } from "@devflow/applyflow-core";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createApplyFlowApplicationService } from "@/lib/persistence-v2/applications/application-service";
import { assertApplyFlowDestructiveDbTargetAllowed } from "@/lib/persistence-v2/db-target-guard";
import { createApplyFlowJobService } from "@/lib/persistence-v2/jobs/job-service";
import { createPersonalImportService } from "@/lib/persistence-v2/personal/import-service";
import { createPrismaPersonalStore } from "@/lib/persistence-v2/personal/prisma-store";
import {
  createPersonalContactsService,
  createPersonalProfileService,
} from "@/lib/persistence-v2/personal/services";
import {
  createApplyFlowApplicationRepository,
  createApplyFlowJobRepository,
} from "@/lib/persistence-v2/repositories";

const RUNTIME_URL =
  "postgresql://applyflow_runtime:applyflow_runtime_local_only@127.0.0.1:5434/applyflow";
const ADMIN_URL = "postgresql://applyflow:applyflow_local_dev@127.0.0.1:5434/applyflow";

const createdAccountIds: string[] = [];

describe("applyflow_runtime role service operations (local)", () => {
  const admin = new PrismaClient({ datasources: { db: { url: ADMIN_URL } } });
  let runtime: PrismaClient;

  beforeAll(async () => {
    process.env.DATABASE_URL = ADMIN_URL;
    process.env.DIRECT_URL = ADMIN_URL;
    process.env.APPLYFLOW_DB_TARGET = "local";
    const target = assertApplyFlowDestructiveDbTargetAllowed();
    expect(target.kind).toBe("safe_local");

    await admin.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'applyflow_runtime') THEN
          CREATE ROLE applyflow_runtime LOGIN PASSWORD 'applyflow_runtime_local_only'
            NOSUPERUSER NOCREATEDB NOCREATEROLE BYPASSRLS;
        ELSE
          ALTER ROLE applyflow_runtime LOGIN PASSWORD 'applyflow_runtime_local_only'
            NOSUPERUSER NOCREATEDB NOCREATEROLE BYPASSRLS;
        END IF;
      END $$;
    `);
    await admin.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO applyflow_runtime`);
    await admin.$executeRawUnsafe(`
      GRANT SELECT, INSERT, UPDATE, DELETE ON
        applyflow_accounts,
        applyflow_jobs,
        applyflow_applications,
        applyflow_migration_sessions,
        applyflow_profile_documents,
        applyflow_contacts,
        applyflow_contact_interactions,
        applyflow_inbound_responses,
        applyflow_career_events,
        applyflow_personal_import_sessions,
        applyflow_extension_grants
      TO applyflow_runtime
    `);

    runtime = new PrismaClient({ datasources: { db: { url: RUNTIME_URL } } });
    const role = await runtime.$queryRaw<
      Array<{ rolname: string; rolsuper: boolean; rolbypassrls: boolean }>
    >`
      SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user
    `;
    expect(role[0]?.rolname).toBe("applyflow_runtime");
    expect(role[0]?.rolsuper).toBe(false);
    expect(role[0]?.rolbypassrls).toBe(true);
  });

  afterAll(async () => {
    for (const accountId of createdAccountIds) {
      await admin.applyFlowExtensionGrant.deleteMany({ where: { accountId } });
      await admin.applyFlowCareerEventRecord.deleteMany({ where: { accountId } });
      await admin.applyFlowContactInteractionRecord.deleteMany({ where: { accountId } });
      await admin.applyFlowContactRecord.deleteMany({ where: { accountId } });
      await admin.applyFlowProfileDocument.deleteMany({ where: { accountId } });
      await admin.applyFlowPersonalImportSession.deleteMany({ where: { accountId } });
      await admin.applyFlowApplication.deleteMany({ where: { accountId } });
      await admin.applyFlowJob.deleteMany({ where: { accountId } });
      await admin.applyFlowAccount.deleteMany({ where: { id: accountId } });
    }
    await runtime.$disconnect();
    await admin.$disconnect();
  });

  it("reads/writes profile, imports, creates job/application, and transitions lifecycle", async () => {
    const account = await runtime.applyFlowAccount.create({
      data: {
        authProviderSub: `e2e_applyflow_runtime_${randomUUID().replace(/-/g, "").slice(0, 20)}`,
        email: "runtime-role@example.test",
        pilotEligible: true,
        canonicalPersistence: "v2_cloud",
      },
    });
    createdAccountIds.push(account.id);

    const store = createPrismaPersonalStore(runtime as never);
    const profiles = createPersonalProfileService(store);
    const contacts = createPersonalContactsService(store);
    const importer = createPersonalImportService(store);
    const library = createResumeLibraryFromProfile(gustavoProfile, {
      now: new Date("2026-10-05T12:00:00.000Z"),
      source: "manual",
    });

    const saved = await profiles.save(account.id, library);
    expect(saved.version).toBe(1);
    expect((await profiles.read(account.id))?.library.variants[0]?.name).toBeTruthy();

    const imported = await importer.importModule(account.id, "profile", {
      confirmImport: true,
      profile: library,
    });
    expect(imported.status === "completed" || imported.resumed).toBe(true);

    await contacts.saveContact(account.id, {
      id: "contact-runtime",
      name: "Runtime Manager",
      type: "engineering_manager",
      status: "not_contacted",
      createdAt: "2026-09-09T12:00:00.000Z",
      updatedAt: "2026-09-09T12:00:00.000Z",
    });

    const jobs = createApplyFlowJobService(createApplyFlowJobRepository(runtime as never));
    const apps = createApplyFlowApplicationService(
      createApplyFlowApplicationRepository(runtime as never),
      createApplyFlowJobRepository(runtime as never),
      runtime as never,
    );

    const job = await jobs.create(account.id, {
      id: "job-runtime-1",
      title: "Runtime Engineer",
      source: "linkedin",
      status: "reviewing",
      jobContext: { skills: ["typescript"] },
      jobMatch: {
        score: 70,
        decision: "apply",
        matchedSkills: ["typescript"],
        missingSkills: [],
        evaluatedAt: "2026-10-05T12:00:00.000Z",
        scoringVersion: "v1",
      },
    });

    const application = await apps.create(account.id, {
      id: "app-runtime-1",
      source: "linkedin",
      status: "reviewing",
      sourceJobId: job.id,
      jobTitle: "Runtime Engineer",
    });

    const conflict = apps.patch(account.id, application.id, application.version - 1, {
      notes: "stale",
    });
    await expect(conflict).rejects.toMatchObject({ code: "version_conflict" });

    const transitioned = await apps.transitionLifecycle(account.id, application.id, application.version, {
      status: "applied",
    });
    expect(transitioned.application.status).toBe("applied");
    expect(transitioned.job?.status).toBe("applied");
    expect(transitioned.event.type).toBe("applied");

    const other = await runtime.applyFlowAccount.create({
      data: {
        authProviderSub: `e2e_applyflow_runtime_${randomUUID().replace(/-/g, "").slice(0, 20)}`,
        email: "runtime-b@example.test",
        pilotEligible: true,
        canonicalPersistence: "v2_cloud",
      },
    });
    createdAccountIds.push(other.id);
    expect(await profiles.read(other.id)).toBeNull();
    expect(await jobs.list(other.id)).toEqual([]);
  });

  it("isolates A/B through HTTP grant auth while Prisma runs as applyflow_runtime", async () => {
    process.env.APPLYFLOW_PERSISTENCE_V2 = "true";
    process.env.DATABASE_URL = RUNTIME_URL;
    process.env.DIRECT_URL = RUNTIME_URL;

    const accountA = await runtime.applyFlowAccount.create({
      data: {
        authProviderSub: `e2e_applyflow_runtime_${randomUUID().replace(/-/g, "").slice(0, 20)}`,
        email: "runtime-api-a@example.test",
        pilotEligible: true,
        canonicalPersistence: "v2_cloud",
      },
    });
    const accountB = await runtime.applyFlowAccount.create({
      data: {
        authProviderSub: `e2e_applyflow_runtime_${randomUUID().replace(/-/g, "").slice(0, 20)}`,
        email: "runtime-api-b@example.test",
        pilotEligible: true,
        canonicalPersistence: "v2_cloud",
      },
    });
    createdAccountIds.push(accountA.id, accountB.id);

    const library = createResumeLibraryFromProfile(gustavoProfile, {
      now: new Date("2026-10-05T12:00:00.000Z"),
      source: "manual",
    });
    const named = {
      ...library,
      variants: library.variants.map((variant) => ({ ...variant, name: "Conta A Runtime API" })),
    };
    await createPersonalProfileService(createPrismaPersonalStore(runtime as never)).save(accountA.id, named);

    globalThis.applyflowPrisma = undefined;
    vi.resetModules();

    const { applyFlowExtensionGrants } = await import("./extension-grants");
    const { GET: getProfile } = await import("@/app/api/applyflow/v2/profile/route");
    const { GET: getJobs, POST: postJob } = await import("@/app/api/applyflow/v2/jobs/route");

    const grantA = await applyFlowExtensionGrants.mint(accountA.id);
    const grantB = await applyFlowExtensionGrants.mint(accountB.id);

    const profileA = await getProfile(
      new Request("http://127.0.0.1:3012/api/applyflow/v2/profile", {
        headers: { authorization: `Bearer ${grantA.token}` },
      }),
    );
    expect(profileA.status).toBe(200);
    const bodyA = (await profileA.json()) as {
      profile?: { library?: { variants?: Array<{ name?: string }> } } | null;
    };
    expect(bodyA.profile?.library?.variants?.[0]?.name).toBe("Conta A Runtime API");

    const profileB = await getProfile(
      new Request("http://127.0.0.1:3012/api/applyflow/v2/profile", {
        headers: {
          authorization: `Bearer ${grantB.token}`,
          "x-applyflow-account-id": accountA.id,
        },
      }),
    );
    expect(profileB.status).toBe(200);
    const bodyB = (await profileB.json()) as { profile?: unknown };
    expect(bodyB.profile).toBeNull();

    const created = await postJob(
      new Request("http://127.0.0.1:3012/api/applyflow/v2/jobs", {
        method: "POST",
        headers: {
          authorization: `Bearer ${grantA.token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          id: `job_runtime_api_${randomUUID().slice(0, 8)}`,
          title: "Runtime API Engineer",
          source: "linkedin",
          status: "reviewing",
          url: "https://example.test/jobs/runtime-api",
          jobContext: { skills: ["typescript"] },
          jobMatch: {
            score: 70,
            decision: "apply",
            matchedSkills: ["typescript"],
            missingSkills: [],
            evaluatedAt: "2026-10-05T12:00:00.000Z",
            scoringVersion: "v1",
          },
        }),
      }),
    );
    if (created.status !== 201) {
      const detail = await created.text();
      throw new Error(`job create expected 201, got ${created.status}: ${detail}`);
    }

    const jobsA = await getJobs(
      new Request("http://127.0.0.1:3012/api/applyflow/v2/jobs", {
        headers: { authorization: `Bearer ${grantA.token}` },
      }),
    );
    const jobsB = await getJobs(
      new Request("http://127.0.0.1:3012/api/applyflow/v2/jobs", {
        headers: { authorization: `Bearer ${grantB.token}` },
      }),
    );
    expect(jobsA.status).toBe(200);
    expect(jobsB.status).toBe(200);
    const listA = (await jobsA.json()) as { jobs: unknown[] };
    const listB = (await jobsB.json()) as { jobs: unknown[] };
    expect(listA.jobs.length).toBeGreaterThanOrEqual(1);
    expect(listB.jobs).toEqual([]);

    const revoked = await getProfile(
      new Request("http://127.0.0.1:3012/api/applyflow/v2/profile", {
        headers: { authorization: "Bearer deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef" },
      }),
    );
    expect(revoked.status).toBe(401);
  });
});
