import { config } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Prisma, PrismaClient } from "../../src/generated/prisma-whatsapp";
import {
  APP_ROOT,
  AUDIT_ACTION_ALLOWLIST,
  LOCK_PATH,
  RECEIPT_PATH,
  abbreviatedRunId,
  acquireFixtureLock,
  hashEmail,
  identityFromReceipt,
  maskedId,
  readReceipt,
  removeReceipt,
  resolveDatasourceUrl,
  targetFingerprint,
  type FixtureLock,
} from "./inbox-e2e-fixture";

type CountResult = { count: number };
type CleanupTx = {
  auditLog: {
    deleteMany(args: { where: Record<string, unknown> }): Promise<CountResult>;
    count(args: { where: Record<string, unknown> }): Promise<number>;
  };
  userSession: {
    deleteMany(args: { where: Record<string, unknown> }): Promise<CountResult>;
    count(args: { where: Record<string, unknown> }): Promise<number>;
  };
  user: {
    deleteMany(args: { where: Record<string, unknown> }): Promise<CountResult>;
  };
  tenant: {
    deleteMany(args: { where: Record<string, unknown> }): Promise<CountResult>;
  };
};

export type CleanupClient = {
  tenant: {
    findUnique(args: { where: { id: string }; select: Record<string, boolean> }): Promise<Record<string, unknown> | null>;
    count(args: { where: Record<string, unknown> }): Promise<number>;
  };
  user: {
    findUnique(args: { where: { id: string }; select: Record<string, boolean> }): Promise<Record<string, unknown> | null>;
    count(args: { where: Record<string, unknown> }): Promise<number>;
  };
  userSession: {
    findMany(args: { where: { userId: string }; select: { id: true } }): Promise<Array<{ id: string }>>;
    count(args: { where: Record<string, unknown> }): Promise<number>;
  };
  auditLog: {
    findMany(args: {
      where: { tenantId: string; userId: string };
      select: { id: true; action: true };
    }): Promise<Array<{ id: string; action: string }>>;
    count(args: { where: Record<string, unknown> }): Promise<number>;
  };
  $transaction<T>(
    callback: (tx: CleanupTx) => Promise<T>,
    options: { isolationLevel: "Serializable"; maxWait: number; timeout: number }
  ): Promise<T>;
};

export type CleanupOptions = {
  client: CleanupClient;
  datasourceUrl: string;
  receiptPath?: string;
  heldLock?: FixtureLock;
};

export type CleanupResult = {
  auditsDeleted: number;
  sessionsDeleted: number;
  usersDeleted: 1;
  tenantsDeleted: 1;
};

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  if (actual !== expected) throw new Error(`Guard mismatch: ${label}`);
}

export async function cleanupInboxFixture(options: CleanupOptions): Promise<CleanupResult> {
  const receiptPath = options.receiptPath ?? RECEIPT_PATH;
  const lockPath = options.receiptPath ? `${receiptPath}.lock` : LOCK_PATH;
  const ownLock = options.heldLock ? undefined : acquireFixtureLock(lockPath);
  try {
    const receipt = readReceipt(receiptPath);
    const fingerprint = targetFingerprint(options.datasourceUrl);
    assertEqual(fingerprint, receipt.targetFingerprint, "target fingerprint");

    const expected = identityFromReceipt(receipt);
    assertEqual(hashEmail(expected.email), receipt.emailHash, "email hash derivation");

    const tenant = await options.client.tenant.findUnique({
      where: { id: receipt.tenantId },
      select: { id: true, name: true, isInternal: true, plan: true },
    });
    if (!tenant) throw new Error("Guard mismatch: tenant ausente");
    assertEqual(tenant.id, receipt.tenantId, "tenant id");
    assertEqual(tenant.name, expected.tenantName, "tenant name");
    assertEqual(tenant.isInternal, false, "tenant internal");
    assertEqual(tenant.plan, "free", "tenant plan");

    const user = await options.client.user.findUnique({
      where: { id: receipt.userId },
      select: { id: true, tenantId: true, email: true, name: true, role: true },
    });
    if (!user) throw new Error("Guard mismatch: user ausente");
    assertEqual(user.id, receipt.userId, "user id");
    assertEqual(user.tenantId, receipt.tenantId, "user tenant");
    assertEqual(user.name, expected.userName, "user name");
    assertEqual(user.role, expected.role, "user role");
    if (typeof user.email !== "string") throw new Error("Guard mismatch: user email");
    assertEqual(hashEmail(user.email), receipt.emailHash, "user email hash");

    const sessions = await options.client.userSession.findMany({
      where: { userId: receipt.userId },
      select: { id: true },
    });
    const audits = await options.client.auditLog.findMany({
      where: { tenantId: receipt.tenantId, userId: receipt.userId },
      select: { id: true, action: true },
    });
    const unexpected = audits.find(
      (row) => !AUDIT_ACTION_ALLOWLIST.includes(row.action as (typeof AUDIT_ACTION_ALLOWLIST)[number])
    );
    if (unexpected) throw new Error(`Unexpected audit action: ${unexpected.action}`);

    const sessionIds = sessions.map((row) => row.id);
    const auditIds = audits.map((row) => row.id);
    const deletedCounts = await options.client.$transaction(
      async (tx) => {
        let auditsDeleted = 0;
        let sessionsDeleted = 0;
        if (auditIds.length > 0) {
          const deleted = await tx.auditLog.deleteMany({
            where: {
              id: { in: auditIds },
              tenantId: receipt.tenantId,
              userId: receipt.userId,
              action: { in: [...AUDIT_ACTION_ALLOWLIST] },
            },
          });
          assertEqual(deleted.count, auditIds.length, "audit delete count");
          auditsDeleted = deleted.count;
        }
        if (sessionIds.length > 0) {
          const deleted = await tx.userSession.deleteMany({
            where: { id: { in: sessionIds }, userId: receipt.userId },
          });
          assertEqual(deleted.count, sessionIds.length, "session delete count");
          sessionsDeleted = deleted.count;
        }
        const residualSessionCount = await tx.userSession.count({
          where: { userId: receipt.userId },
        });
        assertEqual(residualSessionCount, 0, "residual session count");
        const residualAuditCount = await tx.auditLog.count({
          where: { tenantId: receipt.tenantId, userId: receipt.userId },
        });
        assertEqual(residualAuditCount, 0, "residual audit count");

        const deletedUser = await tx.user.deleteMany({
          where: {
            id: receipt.userId,
            tenantId: receipt.tenantId,
            email: expected.email,
            name: expected.userName,
            role: expected.role,
          },
        });
        assertEqual(deletedUser.count, 1, "user delete count");

        const deletedTenant = await tx.tenant.deleteMany({
          where: {
            id: receipt.tenantId,
            name: expected.tenantName,
            isInternal: false,
            plan: "free",
          },
        });
        assertEqual(deletedTenant.count, 1, "tenant delete count");
        return {
          auditsDeleted,
          sessionsDeleted,
          usersDeleted: deletedUser.count as 1,
          tenantsDeleted: deletedTenant.count as 1,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 10_000,
        timeout: 30_000,
      }
    );

    const [tenantCount, userCount, sessionCount, auditCount] = await Promise.all([
      options.client.tenant.count({ where: { id: receipt.tenantId } }),
      options.client.user.count({ where: { id: receipt.userId, tenantId: receipt.tenantId } }),
      options.client.userSession.count({ where: { userId: receipt.userId } }),
      options.client.auditLog.count({
        where: { tenantId: receipt.tenantId, userId: receipt.userId },
      }),
    ]);
    assertEqual(tenantCount, 0, "tenant negative verification");
    assertEqual(userCount, 0, "user negative verification");
    assertEqual(sessionCount, 0, "session negative verification");
    assertEqual(auditCount, 0, "audit negative verification");

    removeReceipt(receiptPath);
    console.info(
      `[inbox-e2e:${abbreviatedRunId(receipt.runId)}] cleaned tenant=${maskedId(receipt.tenantId)} user=${maskedId(receipt.userId)} sessions=${deletedCounts.sessionsDeleted} audits=${deletedCounts.auditsDeleted}`
    );
    return deletedCounts;
  } finally {
    ownLock?.release();
  }
}

function loadLocalEnvironment(): void {
  config({ path: path.resolve(APP_ROOT, "../../.env.local") });
  config({ path: path.resolve(APP_ROOT, ".env.local") });
}

export async function cleanupMain(): Promise<void> {
  loadLocalEnvironment();
  const datasourceUrl = resolveDatasourceUrl();
  const prisma = new PrismaClient({ datasources: { db: { url: datasourceUrl } } });
  try {
    await cleanupInboxFixture({ client: prisma as unknown as CleanupClient, datasourceUrl });
  } finally {
    await prisma.$disconnect();
  }
}

const isDirectExecution =
  Boolean(process.argv[1]) && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isDirectExecution) {
  cleanupMain().catch((error: unknown) => {
    if (fs.existsSync(RECEIPT_PATH)) {
      console.error("Cleanup abortado; recibo preservado");
    }
    console.error(error instanceof Error ? error.message : "Falha na limpeza");
    process.exitCode = 1;
  });
}
