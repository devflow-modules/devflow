/**
 * In-memory ApplyFlowPersistenceDb for migration / activation unit tests.
 * Supports account canonical promotion and session completion atomicity.
 */
import type { ApplyFlowAccount, ApplyFlowCanonicalPersistence } from "@prisma/client";

import type {
  ApplyFlowApplication,
  ApplyFlowJob,
  ApplyFlowMigrationSession,
  ApplyFlowPersistenceDb,
  ApplyFlowPersistenceTx,
} from "./repositories/types";

function key(accountId: string, id: string): string {
  return `${accountId}::${id}`;
}

export type MemoryAccount = Pick<
  ApplyFlowAccount,
  "id" | "authProviderSub" | "email" | "pilotEligible" | "canonicalPersistence" | "createdAt" | "updatedAt"
>;

export function createMemoryPersistenceDb(seedAccounts: MemoryAccount[] = []): {
  db: ApplyFlowPersistenceDb;
  accounts: Map<string, MemoryAccount>;
  jobs: Map<string, ApplyFlowJob>;
  applications: Map<string, ApplyFlowApplication>;
  sessions: Map<string, ApplyFlowMigrationSession>;
} {
  const accounts = new Map<string, MemoryAccount>(seedAccounts.map((a) => [a.id, { ...a }]));
  const jobs = new Map<string, ApplyFlowJob>();
  const applications = new Map<string, ApplyFlowApplication>();
  const sessions = new Map<string, ApplyFlowMigrationSession>();
  let sessionSeq = 0;

  const jobDelegate = {
    create: async ({ data }: { data: Record<string, unknown> }) => {
      const k = key(String(data.accountId), String(data.id));
      if (jobs.has(k)) throw Object.assign(new Error("unique"), { code: "P2002" });
      const record = {
        ...data,
        version: 1,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      } as ApplyFlowJob;
      jobs.set(k, record);
      return record;
    },
    findUnique: async ({ where }: { where: { accountId_id: { accountId: string; id: string } } }) => {
      return jobs.get(key(where.accountId_id.accountId, where.accountId_id.id)) ?? null;
    },
    findMany: async ({ where }: { where: Record<string, unknown> }) => {
      return [...jobs.values()].filter((job) => {
        if (where.accountId && job.accountId !== where.accountId) return false;
        return true;
      });
    },
    count: async ({ where }: { where: { accountId: string } }) => {
      return [...jobs.values()].filter((job) => job.accountId === where.accountId).length;
    },
  };

  const applicationDelegate = {
    create: async ({ data }: { data: Record<string, unknown> }) => {
      const accountId = String(data.accountId);
      const id = String(data.id);
      const k = key(accountId, id);
      if (applications.has(k)) {
        throw Object.assign(new Error("unique"), {
          code: "P2002",
          meta: { target: ["accountId", "id"] },
        });
      }
      const sourceJobId =
        data.sourceJobId === undefined || data.sourceJobId === null ? null : String(data.sourceJobId);
      if (
        sourceJobId &&
        [...applications.values()].some(
          (row) => row.accountId === accountId && row.sourceJobId === sourceJobId,
        )
      ) {
        throw Object.assign(new Error("unique"), {
          code: "P2002",
          meta: { target: ["applyflow_applications_account_id_source_job_id_uidx"] },
        });
      }
      const record = {
        ...data,
        sourceJobId,
        version: 1,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      } as ApplyFlowApplication;
      applications.set(k, record);
      return record;
    },
    findUnique: async ({ where }: { where: { accountId_id: { accountId: string; id: string } } }) => {
      return applications.get(key(where.accountId_id.accountId, where.accountId_id.id)) ?? null;
    },
    findMany: async ({ where }: { where: Record<string, unknown> }) => {
      return [...applications.values()]
        .filter((app) => {
          if (where.accountId && app.accountId !== where.accountId) return false;
          if ("sourceJobId" in where && app.sourceJobId !== where.sourceJobId) return false;
          return true;
        })
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    },
    count: async ({ where }: { where: { accountId: string } }) => {
      return [...applications.values()].filter((app) => app.accountId === where.accountId).length;
    },
  };

  const migrationSessionDelegate = {
    create: async ({ data }: { data: Record<string, unknown> }) => {
      for (const existing of sessions.values()) {
        if (
          existing.accountId === data.accountId &&
          existing.sourceVersion === data.sourceVersion &&
          existing.bundleFingerprint === data.bundleFingerprint
        ) {
          throw Object.assign(new Error("unique"), { code: "P2002" });
        }
      }
      const id = `11111111-1111-1111-1111-${String(++sessionSeq).padStart(12, "0")}`;
      const record = {
        id,
        accountId: data.accountId,
        sourceVersion: data.sourceVersion,
        bundleFingerprint: data.bundleFingerprint,
        status: data.status,
        expectedJobs: data.expectedJobs,
        expectedApplications: data.expectedApplications,
        processedJobs: data.processedJobs ?? 0,
        processedApplications: data.processedApplications ?? 0,
        conflictSummary: data.conflictSummary ?? null,
        startedAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        completedAt: null,
      } as ApplyFlowMigrationSession;
      sessions.set(id, record);
      return record;
    },
    findUnique: async ({
      where,
    }: {
      where:
        | { id: string }
        | {
            accountId_sourceVersion_bundleFingerprint: {
              accountId: string;
              sourceVersion: number;
              bundleFingerprint: string;
            };
          };
    }) => {
      if ("id" in where) return sessions.get(where.id) ?? null;
      const parts = where.accountId_sourceVersion_bundleFingerprint;
      return (
        [...sessions.values()].find(
          (row) =>
            row.accountId === parts.accountId &&
            row.sourceVersion === parts.sourceVersion &&
            row.bundleFingerprint === parts.bundleFingerprint,
        ) ?? null
      );
    },
    findMany: async ({ where }: { where: { accountId: string } }) => {
      return [...sessions.values()].filter((row) => row.accountId === where.accountId);
    },
    update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
      const existing = sessions.get(where.id);
      if (!existing) throw new Error("not found");
      const next = {
        ...existing,
        ...data,
        updatedAt: new Date("2026-01-03T00:00:00.000Z"),
      } as ApplyFlowMigrationSession;
      sessions.set(where.id, next);
      return next;
    },
  };

  const accountDelegate = {
    findUnique: async ({
      where,
      select,
    }: {
      where: { id: string };
      select?: Record<string, boolean>;
    }) => {
      const row = accounts.get(where.id);
      if (!row) return null;
      if (!select) return row;
      const picked: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(select)) {
        if (v) picked[k] = (row as Record<string, unknown>)[k];
      }
      return picked as MemoryAccount;
    },
    updateMany: async ({
      where,
      data,
    }: {
      where: { id: string; canonicalPersistence: ApplyFlowCanonicalPersistence };
      data: { canonicalPersistence: ApplyFlowCanonicalPersistence };
    }) => {
      const row = accounts.get(where.id);
      if (!row || row.canonicalPersistence !== where.canonicalPersistence) {
        return { count: 0 };
      }
      row.canonicalPersistence = data.canonicalPersistence;
      row.updatedAt = new Date("2026-01-03T00:00:00.000Z");
      accounts.set(where.id, row);
      return { count: 1 };
    },
  };

  const txSurface = {
    applyFlowJob: jobDelegate,
    applyFlowApplication: applicationDelegate,
    applyFlowMigrationSession: migrationSessionDelegate,
    applyFlowAccount: accountDelegate,
  } as unknown as ApplyFlowPersistenceTx;

  const db = {
    ...txSurface,
    /**
     * Snapshot + rollback on throw so complete+promote atomicity can be proven in unit tests.
     * Mirrors PostgreSQL transaction abort semantics for in-memory maps (shallow clone of entries).
     */
    $transaction: async <T>(fn: (tx: ApplyFlowPersistenceTx) => Promise<T>) => {
      const snapAccounts = new Map(
        [...accounts.entries()].map(([id, row]) => [id, { ...row }]),
      );
      const snapJobs = new Map([...jobs.entries()].map(([k, row]) => [k, { ...row }]));
      const snapApps = new Map(
        [...applications.entries()].map(([k, row]) => [k, { ...row }]),
      );
      const snapSessions = new Map(
        [...sessions.entries()].map(([k, row]) => [k, { ...row }]),
      );
      const snapSeq = sessionSeq;
      try {
        return await fn(txSurface);
      } catch (error) {
        accounts.clear();
        for (const [id, row] of snapAccounts) accounts.set(id, row);
        jobs.clear();
        for (const [k, row] of snapJobs) jobs.set(k, row);
        applications.clear();
        for (const [k, row] of snapApps) applications.set(k, row);
        sessions.clear();
        for (const [k, row] of snapSessions) sessions.set(k, row);
        sessionSeq = snapSeq;
        throw error;
      }
    },
  } as ApplyFlowPersistenceDb;

  return { db, accounts, jobs, applications, sessions };
}

export function memoryPilotAccount(
  id: string,
  overrides: Partial<MemoryAccount> = {},
): MemoryAccount {
  return {
    id,
    authProviderSub: `sub_${id}`,
    email: "pilot@example.com",
    pilotEligible: true,
    canonicalPersistence: "v1_local",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}
