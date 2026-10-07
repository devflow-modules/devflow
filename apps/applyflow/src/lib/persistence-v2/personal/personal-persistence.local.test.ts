import { randomUUID } from "node:crypto";

import { createResumeLibraryFromProfile, gustavoProfile, type Contact } from "@devflow/applyflow-core";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApplyFlowApplicationService } from "@/lib/persistence-v2/applications/application-service";
import { applyflowPrisma } from "@/lib/persistence-v2/db";
import { assertApplyFlowDestructiveDbTargetAllowed } from "@/lib/persistence-v2/db-target-guard";
import { createPersonalImportService } from "@/lib/persistence-v2/personal/import-service";
import { applyFlowPersonalStore } from "@/lib/persistence-v2/personal/prisma-store";
import {
  PersonalServiceError,
  createPersonalContactsService,
  createPersonalProfileService,
  createPersonalResponsesService,
} from "@/lib/persistence-v2/personal/services";

const createdAccountIds: string[] = [];

function library(name: string) {
  const base = createResumeLibraryFromProfile(gustavoProfile, {
    now: new Date("2026-10-05T12:00:00.000Z"),
    source: "manual",
  });
  return {
    ...base,
    variants: base.variants.map((variant) => ({ ...variant, name })),
  };
}

function contact(id: string, applicationId?: string, jobId?: string): Contact {
  return {
    id,
    name: "Jordan Manager",
    type: "engineering_manager",
    status: "not_contacted",
    createdAt: "2026-09-09T12:00:00.000Z",
    updatedAt: "2026-09-09T12:00:00.000Z",
    ...(applicationId && jobId ? { applicationId, jobId } : {}),
  };
}

function detection(id: string, emailId: string, provider: "gmail" | "manual") {
  return {
    id,
    emailId,
    provider,
    headline: "Empresa enviou uma mensagem",
    matchStatus: "unmatched" as const,
    matchConfidence: "low" as const,
    matchEvidence: [],
    classification: "unknown" as const,
    classificationConfidence: "high" as const,
    classificationEvidence: [],
    suggestedStatus: null,
    pipelineChange: false,
    state: "pending_review" as const,
    detectedAt: "2026-09-15T18:00:00.000Z",
    receivedAt: "2026-09-15T18:00:00.000Z",
    senderDomain: "jobs.example",
    autoApply: false as const,
    reviewRequired: true as const,
  };
}

async function seedAccount() {
  const account = await applyflowPrisma.applyFlowAccount.create({
    data: {
      authProviderSub: `e2e_applyflow_personal_${randomUUID().replace(/-/g, "").slice(0, 24)}`,
      email: "personal-local@example.test",
      pilotEligible: true,
      canonicalPersistence: "v2_cloud",
    },
  });
  createdAccountIds.push(account.id);
  return account;
}

describe("personal persistence on local ApplyFlow Postgres", () => {
  const profiles = createPersonalProfileService(applyFlowPersonalStore);
  const contacts = createPersonalContactsService(applyFlowPersonalStore);
  const responses = createPersonalResponsesService(applyFlowPersonalStore);
  const importer = createPersonalImportService(applyFlowPersonalStore);

  beforeAll(async () => {
    const target = assertApplyFlowDestructiveDbTargetAllowed();
    expect(target.kind).toBe("safe_local");
    expect(target.dbHost).toBe("127.0.0.1");
    expect(target.dbName).toBe("applyflow");
    await applyflowPrisma.$queryRaw`SELECT 1`;
  });

  afterAll(async () => {
    for (const accountId of createdAccountIds) {
      await applyflowPrisma.applyFlowCareerEventRecord.deleteMany({ where: { accountId } });
      await applyflowPrisma.applyFlowInboundResponseRecord.deleteMany({ where: { accountId } });
      await applyflowPrisma.applyFlowContactInteractionRecord.deleteMany({ where: { accountId } });
      await applyflowPrisma.applyFlowContactRecord.deleteMany({ where: { accountId } });
      await applyflowPrisma.applyFlowProfileDocument.deleteMany({ where: { accountId } });
      await applyflowPrisma.applyFlowPersonalImportSession.deleteMany({ where: { accountId } });
      await applyflowPrisma.applyFlowExtensionGrant.deleteMany({ where: { accountId } });
      await applyflowPrisma.applyFlowApplication.deleteMany({ where: { accountId } });
      await applyflowPrisma.applyFlowJob.deleteMany({ where: { accountId } });
      await applyflowPrisma.applyFlowMigrationSession.deleteMany({ where: { accountId } });
      await applyflowPrisma.applyFlowAccount.deleteMany({ where: { id: accountId } });
    }
    await applyflowPrisma.$disconnect();
  });

  it("keeps account A data isolated from account B and from sender-only identity", async () => {
    const accountA = await seedAccount();
    const accountB = await seedAccount();
    await applyflowPrisma.applyFlowJob.create({
      data: {
        accountId: accountA.id,
        id: "job-a",
        title: "Fixture",
        source: "manual",
        status: "applied",
        jobContext: {},
        jobMatch: {},
      },
    });
    await applyflowPrisma.applyFlowApplication.create({
      data: {
        accountId: accountA.id,
        id: "app-a",
        sourceJobId: "job-a",
        source: "manual",
        status: "applied",
      },
    });

    const saved = await profiles.save(accountA.id, library("Conta A"));
    await contacts.saveContact(accountA.id, contact("contact-a", "app-a", "job-a"));
    await contacts.saveInteraction(accountA.id, {
      id: "interaction-a",
      contactId: "contact-a",
      applicationId: "app-a",
      jobId: "job-a",
      type: "note",
      occurredAt: "2026-10-05T12:00:00.000Z",
    });
    await responses.save(accountA.id, detection("detect-1", "msg-a-1", "gmail"));
    await responses.save(accountA.id, detection("detect-2", "msg-a-2", "gmail"));
    await responses.save(accountA.id, detection("detect-3", "msg-a-1", "manual"));

    expect((await profiles.read(accountA.id))?.library.variants[0]?.name).toBe("Conta A");
    expect((await contacts.list(accountA.id)).contacts).toHaveLength(1);
    expect((await contacts.list(accountA.id)).interactions).toHaveLength(1);
    expect(await responses.list(accountA.id)).toHaveLength(3);
    expect(await profiles.read(accountB.id)).toBeNull();
    expect((await contacts.list(accountB.id)).contacts).toHaveLength(0);
    await expect(contacts.saveContact(accountB.id, contact("contact-b", "app-a", "job-a"))).rejects.toMatchObject({
      code: "not_found",
    });
    await expect(profiles.save(accountA.id, library("Outra"), saved.version - 1)).rejects.toBeInstanceOf(
      PersonalServiceError,
    );
    expect((await profiles.read(accountA.id))?.version).toBe(saved.version);
    expect((await profiles.read(accountA.id))?.library.variants[0]?.name).toBe("Conta A");
  });

  it("imports only after confirmation, resumes without duplicates, and does not change canonical persistence", async () => {
    const account = await seedAccount();
    const before = await applyflowPrisma.applyFlowAccount.findUniqueOrThrow({ where: { id: account.id } });
    await expect(
      importer.importModule(account.id, "profile", { confirmImport: false, profile: library("Local") }),
    ).rejects.toMatchObject({ code: "import_not_confirmed" });
    const first = await importer.importModule(account.id, "profile", {
      confirmImport: true,
      profile: library("Local"),
    });
    const second = await importer.importModule(account.id, "profile", {
      confirmImport: true,
      profile: library("Local"),
    });
    expect(first.status).toBe("completed");
    expect(second.resumed).toBe(true);
    expect(second.processedCount).toBe(first.processedCount);
    const conflict = await importer.importModule(account.id, "profile", {
      confirmImport: true,
      profile: library("Cloud diferente"),
    });
    expect(conflict.status).toBe("conflict");
    expect((await profiles.read(account.id))?.library.variants[0]?.name).toBe("Local");
    const after = await applyflowPrisma.applyFlowAccount.findUniqueOrThrow({ where: { id: account.id } });
    expect(after.canonicalPersistence).toBe(before.canonicalPersistence);
    expect(after.pilotEligible).toBe(before.pilotEligible);
  });

  it("writes the application, the linked job, and a real career event in one transaction", async () => {
    const account = await seedAccount();
    const jobId = "job-ok";
    const applicationId = "app-ok";
    await applyflowPrisma.applyFlowJob.create({
      data: {
        accountId: account.id,
        id: jobId,
        title: "Fixture",
        source: "manual",
        status: "applied",
        jobContext: {},
        jobMatch: {},
      },
    });
    await applyflowPrisma.applyFlowApplication.create({
      data: {
        accountId: account.id,
        id: applicationId,
        sourceJobId: jobId,
        source: "manual",
        status: "applied",
      },
    });
    const service = createApplyFlowApplicationService();
    const result = await service.transitionLifecycle(account.id, applicationId, 1, { status: "interview" });
    expect(result.jobSynced).toBe(true);
    expect(result.application.status).toBe("interview");
    expect(result.job?.status).toBe("interview");
    expect(result.event.type).toBe("screening");
    const stored = await applyflowPrisma.applyFlowCareerEventRecord.findUniqueOrThrow({
      where: { accountId_id: { accountId: account.id, id: result.event.id } },
    });
    expect(stored.eventType).toBe("screening");
    expect(stored.applicationId).toBe(applicationId);
    expect(stored.jobId).toBe(jobId);
  });

  it("rolls back the application and the career event when the job version conflicts", async () => {
    const account = await seedAccount();
    const jobId = "job-lock";
    const applicationId = "app-lock";
    await applyflowPrisma.applyFlowJob.create({
      data: {
        accountId: account.id,
        id: jobId,
        title: "Fixture",
        source: "manual",
        status: "applied",
        jobContext: {},
        jobMatch: {},
      },
    });
    await applyflowPrisma.applyFlowApplication.create({
      data: {
        accountId: account.id,
        id: applicationId,
        sourceJobId: jobId,
        source: "manual",
        status: "applied",
      },
    });

    const holder = new PrismaClient();
    let releaseLock: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    let markHeld: () => void = () => undefined;
    const lockHeld = new Promise<void>((resolve) => {
      markHeld = resolve;
    });
    const held = holder.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM applyflow_jobs WHERE account_id = ${account.id}::uuid AND id = ${jobId} FOR UPDATE`;
        markHeld();
        await gate;
        await tx.applyFlowJob.updateMany({
          where: { accountId: account.id, id: jobId, version: 1 },
          data: { version: { increment: 1 } },
        });
      },
      { maxWait: 5_000, timeout: 20_000 },
    );

    await lockHeld;
    const service = createApplyFlowApplicationService();
    const pending = service.transitionLifecycle(account.id, applicationId, 1, { status: "interview" });
    const started = Date.now();
    let sawWaiter = false;
    while (Date.now() - started < 3_000) {
      const waiting = await applyflowPrisma.$queryRaw<Array<{ n: number }>>`
        SELECT COUNT(*)::int AS n
        FROM pg_stat_activity
        WHERE datname = current_database()
          AND wait_event_type = 'Lock'
          AND pid <> pg_backend_pid()
      `;
      if (Number(waiting[0]?.n ?? 0) > 0) {
        sawWaiter = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    expect(sawWaiter).toBe(true);
    releaseLock();
    await held;
    await expect(pending).rejects.toMatchObject({ code: "version_conflict" });

    const application = await applyflowPrisma.applyFlowApplication.findUniqueOrThrow({
      where: { accountId_id: { accountId: account.id, id: applicationId } },
    });
    const events = await applyflowPrisma.applyFlowCareerEventRecord.count({ where: { accountId: account.id } });
    expect(application.status).toBe("applied");
    expect(application.version).toBe(1);
    expect(events).toBe(0);
    await holder.$disconnect();
  });

  it("enables RLS without force and shows the Prisma role bypasses it", async () => {
    const tables = await applyflowPrisma.$queryRaw<
      Array<{ relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean }>
    >`
      SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname IN (
          'applyflow_profile_documents',
          'applyflow_contacts',
          'applyflow_inbound_responses',
          'applyflow_career_events',
          'applyflow_extension_grants'
        )
    `;
    expect(tables).toHaveLength(5);
    expect(tables.every((table) => table.relrowsecurity && !table.relforcerowsecurity)).toBe(true);
    const policies = await applyflowPrisma.$queryRaw<Array<{ polname: string }>>`
      SELECT pol.polname
      FROM pg_policy pol
      JOIN pg_class c ON c.oid = pol.polrelid
      WHERE c.relname LIKE 'applyflow_%'
    `;
    expect(policies).toHaveLength(0);
    const role = await applyflowPrisma.$queryRaw<Array<{ rolname: string; rolsuper: boolean; rolbypassrls: boolean }>>`
      SELECT rolname, rolsuper, rolbypassrls
      FROM pg_roles
      WHERE rolname = current_user
    `;
    expect(role[0]?.rolbypassrls || role[0]?.rolsuper).toBe(true);
  });
});
