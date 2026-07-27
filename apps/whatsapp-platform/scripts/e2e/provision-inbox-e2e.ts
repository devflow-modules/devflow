import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Prisma, PrismaClient } from "../../src/generated/prisma-whatsapp";
import {
  LOCK_PATH,
  RECEIPT_PATH,
  abbreviatedRunId,
  acquireFixtureLock,
  buildIdentity,
  hashEmail,
  maskedId,
  normalizeEmail,
  receiptFor,
  removeReceipt,
  targetFingerprint,
  writeReceiptAtomic,
  type FixtureIdentity,
  type FixtureLock,
} from "./inbox-e2e-fixture";
import {
  resolveInboxE2EEnvironment,
  type InboxE2EEnvironment,
} from "./inbox-e2e-environment";

type ProvisionTx = {
  user: {
    findUnique(args: { where: { email: string }; select: { id: true } }): Promise<{ id: string } | null>;
    create(args: {
      data: {
        id: string;
        tenantId: string;
        email: string;
        passwordHash: string;
        name: string;
        role: string;
      };
    }): Promise<unknown>;
  };
  tenant: {
    create(args: {
      data: { id: string; name: string; isInternal: false; plan: string };
    }): Promise<unknown>;
  };
};

export type ProvisionClient = {
  $transaction<T>(
    callback: (tx: ProvisionTx) => Promise<T>,
    options: { isolationLevel: "Serializable"; maxWait: number; timeout: number }
  ): Promise<T>;
};

export type ProvisionOptions = {
  client: ProvisionClient;
  datasourceUrl: string;
  identity?: FixtureIdentity;
  receiptPath?: string;
  heldLock?: FixtureLock;
  afterTenantCreated?: () => Promise<void> | void;
};

export async function provisionInboxFixture(options: ProvisionOptions): Promise<FixtureIdentity> {
  const receiptPath = options.receiptPath ?? RECEIPT_PATH;
  const lockPath = options.receiptPath ? `${receiptPath}.lock` : LOCK_PATH;
  const ownLock = options.heldLock ? undefined : acquireFixtureLock(lockPath);
  const suppliedIdentity = options.identity ?? buildIdentity();
  const normalizedEmail = normalizeEmail(suppliedIdentity.email);
  const identity: FixtureIdentity = {
    ...suppliedIdentity,
    email: normalizedEmail,
    emailHash: hashEmail(normalizedEmail),
  };
  const fingerprint = targetFingerprint(options.datasourceUrl);
  let receiptWritten = false;

  try {
    writeReceiptAtomic(receiptFor(identity, fingerprint), receiptPath);
    receiptWritten = true;
    const passwordHash = await bcrypt.hash(identity.password, 10);

    await options.client.$transaction(
      async (tx) => {
        const collision = await tx.user.findUnique({
          where: { email: identity.email },
          select: { id: true },
        });
        if (collision) throw new Error("E-mail normalizado já existe; provisionamento abortado");

        await tx.tenant.create({
          data: {
            id: identity.tenantId,
            name: identity.tenantName,
            isInternal: false,
            plan: "free",
          },
        });
        await options.afterTenantCreated?.();
        await tx.user.create({
          data: {
            id: identity.userId,
            tenantId: identity.tenantId,
            email: identity.email,
            passwordHash,
            name: identity.userName,
            role: identity.role,
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 10_000,
        timeout: 30_000,
      }
    );

    console.info(
      `[inbox-e2e:${abbreviatedRunId(identity.runId)}] provisioned tenant=${maskedId(identity.tenantId)} user=${maskedId(identity.userId)}`
    );
    return identity;
  } catch (error) {
    if (receiptWritten && fs.existsSync(receiptPath)) removeReceipt(receiptPath);
    throw error;
  } finally {
    ownLock?.release();
  }
}

export async function provisionMain(
  resolvedEnvironment: InboxE2EEnvironment = resolveInboxE2EEnvironment()
): Promise<void> {
  const { datasourceUrl } = resolvedEnvironment;
  const prisma = new PrismaClient({ datasources: { db: { url: datasourceUrl } } });
  try {
    await provisionInboxFixture({ client: prisma as unknown as ProvisionClient, datasourceUrl });
  } finally {
    await prisma.$disconnect();
  }
}

const isDirectExecution =
  Boolean(process.argv[1]) && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isDirectExecution) {
  provisionMain().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Falha no provisionamento");
    process.exitCode = 1;
  });
}
