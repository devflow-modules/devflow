import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  acquireFixtureLock,
  buildIdentity,
  hashEmail,
  identityFromReceipt,
  readReceipt,
  receiptFor,
  targetFingerprint,
  writeReceiptAtomic,
} from "./inbox-e2e-fixture";
import { provisionInboxFixture, type ProvisionClient } from "./provision-inbox-e2e";
import { cleanupInboxFixture, type CleanupClient } from "./cleanup-inbox-e2e";

const PROJECT_REF = "project-ref-secret";
const DATABASE_HOSTNAME = `${PROJECT_REF}.db.example.test`;
const DATABASE_URL = `postgresql://secret-user:secret-pass@${DATABASE_HOSTNAME}:5432/fixture?sslmode=require`;
const tempDirs: string[] = [];

function tempPath(name = "receipt.json"): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "inbox-fixture-"));
  tempDirs.push(dir);
  return path.join(dir, name);
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

function createReceipt() {
  const identity = buildIdentity("1234567890abcdef1234567890abcdef");
  return {
    identity,
    receipt: receiptFor(identity, targetFingerprint(DATABASE_URL)),
  };
}

function cleanupClient(
  identity: ReturnType<typeof buildIdentity>,
  overrides: {
    tenant?: Record<string, unknown> | null;
    user?: Record<string, unknown> | null;
    audits?: Array<{ id: string; action: string }>;
    sessions?: Array<{ id: string }>;
    deleteCount?: Partial<Record<"audit" | "session" | "user" | "tenant", number>>;
    negativeCount?: number;
  } = {}
): { client: CleanupClient; calls: Array<{ kind: string; args: unknown }> } {
  const calls: Array<{ kind: string; args: unknown }> = [];
  const tenant =
    overrides.tenant === undefined
      ? { id: identity.tenantId, name: identity.tenantName, isInternal: false, plan: "free" }
      : overrides.tenant;
  const user =
    overrides.user === undefined
      ? {
          id: identity.userId,
          tenantId: identity.tenantId,
          email: identity.email,
          name: identity.userName,
          role: identity.role,
        }
      : overrides.user;
  const sessions = overrides.sessions ?? [{ id: "session-owned" }];
  const audits = overrides.audits ?? [{ id: "audit-owned", action: "login_success" }];
  const count = overrides.deleteCount ?? {};
  const tx = {
    auditLog: {
      deleteMany: async (args: unknown) => {
        calls.push({ kind: "audit.deleteMany", args });
        return { count: count.audit ?? audits.length };
      },
      count: async (args: unknown) => {
        calls.push({ kind: "audit.txCount", args });
        return overrides.negativeCount ?? 0;
      },
    },
    userSession: {
      deleteMany: async (args: unknown) => {
        calls.push({ kind: "session.deleteMany", args });
        return { count: count.session ?? sessions.length };
      },
      count: async (args: unknown) => {
        calls.push({ kind: "session.txCount", args });
        return overrides.negativeCount ?? 0;
      },
    },
    user: {
      deleteMany: async (args: unknown) => {
        calls.push({ kind: "user.deleteMany", args });
        return { count: count.user ?? 1 };
      },
    },
    tenant: {
      deleteMany: async (args: unknown) => {
        calls.push({ kind: "tenant.deleteMany", args });
        return { count: count.tenant ?? 1 };
      },
    },
  };
  const client = {
    tenant: {
      findUnique: async (args: unknown) => {
        calls.push({ kind: "tenant.findUnique", args });
        return tenant;
      },
      count: async (args: unknown) => {
        calls.push({ kind: "tenant.count", args });
        return overrides.negativeCount ?? 0;
      },
    },
    user: {
      findUnique: async (args: unknown) => {
        calls.push({ kind: "user.findUnique", args });
        return user;
      },
      count: async (args: unknown) => {
        calls.push({ kind: "user.count", args });
        return overrides.negativeCount ?? 0;
      },
    },
    userSession: {
      findMany: async (args: unknown) => {
        calls.push({ kind: "session.findMany", args });
        return sessions;
      },
      count: async (args: unknown) => {
        calls.push({ kind: "session.count", args });
        return overrides.negativeCount ?? 0;
      },
    },
    auditLog: {
      findMany: async (args: unknown) => {
        calls.push({ kind: "audit.findMany", args });
        return audits;
      },
      count: async (args: unknown) => {
        calls.push({ kind: "audit.count", args });
        return overrides.negativeCount ?? 0;
      },
    },
    $transaction: async (callback: (value: typeof tx) => Promise<unknown>) => callback(tx),
  };
  return { client: client as unknown as CleanupClient, calls };
}

function statefulCleanupClient(
  identity: ReturnType<typeof buildIdentity>,
  options: { injectLateAudit?: boolean; injectLateSession?: boolean } = {}
) {
  const state = {
    tenants: [
      { id: identity.tenantId, name: identity.tenantName, isInternal: false, plan: "free" },
      { id: "other-tenant", name: "Existing", isInternal: false, plan: "paid" },
    ],
    users: [
      {
        id: identity.userId,
        tenantId: identity.tenantId,
        email: identity.email,
        name: identity.userName,
        role: identity.role,
      },
      {
        id: "other-user",
        tenantId: "other-tenant",
        email: "existing@example.invalid",
        name: "Existing",
        role: "manager",
      },
    ],
    sessions: [
      { id: "owned-session", userId: identity.userId },
      { id: "other-session", userId: "other-user" },
    ],
    audits: [
      {
        id: "owned-audit",
        tenantId: identity.tenantId,
        userId: identity.userId,
        action: "login_success",
      },
      {
        id: "other-audit",
        tenantId: "other-tenant",
        userId: "other-user",
        action: "login_success",
      },
    ],
  };
  const ids = (where: Record<string, unknown>) =>
    (((where.id as { in?: string[] } | undefined)?.in ?? []) as string[]);
  const tx = {
    auditLog: {
      deleteMany: async ({ where }: { where: Record<string, unknown> }) => {
        const before = state.audits.length;
        const captured = ids(where);
        state.audits = state.audits.filter(
          (row) =>
            !(
              captured.includes(row.id) &&
              row.tenantId === where.tenantId &&
              row.userId === where.userId &&
              (where.action as { in: string[] }).in.includes(row.action)
            )
        );
        return { count: before - state.audits.length };
      },
      count: async ({ where }: { where: Record<string, unknown> }) =>
        state.audits.filter(
          (row) => row.tenantId === where.tenantId && row.userId === where.userId
        ).length,
    },
    userSession: {
      deleteMany: async ({ where }: { where: Record<string, unknown> }) => {
        const before = state.sessions.length;
        const captured = ids(where);
        state.sessions = state.sessions.filter(
          (row) => !(captured.includes(row.id) && row.userId === where.userId)
        );
        return { count: before - state.sessions.length };
      },
      count: async ({ where }: { where: Record<string, unknown> }) =>
        state.sessions.filter((row) => row.userId === where.userId).length,
    },
    user: {
      deleteMany: async ({ where }: { where: Record<string, unknown> }) => {
        const before = state.users.length;
        state.users = state.users.filter(
          (row) =>
            !(
              row.id === where.id &&
              row.tenantId === where.tenantId &&
              row.email === where.email &&
              row.name === where.name &&
              row.role === where.role
            )
        );
        return { count: before - state.users.length };
      },
    },
    tenant: {
      deleteMany: async ({ where }: { where: Record<string, unknown> }) => {
        const before = state.tenants.length;
        state.tenants = state.tenants.filter(
          (row) =>
            !(
              row.id === where.id &&
              row.name === where.name &&
              row.isInternal === where.isInternal &&
              row.plan === where.plan
            )
        );
        return { count: before - state.tenants.length };
      },
    },
  };
  const client = {
    tenant: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        state.tenants.find((row) => row.id === where.id) ?? null,
      count: async ({ where }: { where: Record<string, unknown> }) =>
        state.tenants.filter((row) => row.id === where.id).length,
    },
    user: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        state.users.find((row) => row.id === where.id) ?? null,
      count: async ({ where }: { where: Record<string, unknown> }) =>
        state.users.filter((row) => row.id === where.id && row.tenantId === where.tenantId).length,
    },
    userSession: {
      findMany: async ({ where }: { where: { userId: string } }) =>
        state.sessions.filter((row) => row.userId === where.userId).map(({ id }) => ({ id })),
      count: tx.userSession.count,
    },
    auditLog: {
      findMany: async ({ where }: { where: { tenantId: string; userId: string } }) =>
        state.audits
          .filter((row) => row.tenantId === where.tenantId && row.userId === where.userId)
          .map(({ id, action }) => ({ id, action })),
      count: tx.auditLog.count,
    },
    $transaction: async (callback: (value: typeof tx) => Promise<unknown>) => {
      if (options.injectLateAudit) {
        state.audits.push({
          id: "late-audit",
          tenantId: identity.tenantId,
          userId: identity.userId,
          action: "login_success",
        });
      }
      if (options.injectLateSession) {
        state.sessions.push({ id: "late-session", userId: identity.userId });
      }
      const snapshot = structuredClone(state);
      try {
        return await callback(tx);
      } catch (error) {
        Object.assign(state, snapshot);
        throw error;
      }
    },
  };
  return { client: client as unknown as CleanupClient, state };
}

describe("safe inbox fixture receipt", () => {
  it("rejects a second active receipt and concurrent lock", () => {
    const receiptPath = tempPath();
    const { receipt } = createReceipt();
    writeReceiptAtomic(receipt, receiptPath);
    expect(() => writeReceiptAtomic(receipt, receiptPath)).toThrow(/recibo ativo/);

    const lockPath = path.join(path.dirname(receiptPath), "fixture.lock");
    const lock = acquireFixtureLock(lockPath);
    expect(() => acquireFixtureLock(lockPath)).toThrow(/execução ou limpeza/);
    lock.release();
  });

  it("stores only ownership identifiers, hash, version and fingerprint", () => {
    const receiptPath = tempPath();
    const { identity, receipt } = createReceipt();
    writeReceiptAtomic(receipt, receiptPath);
    const raw = fs.readFileSync(receiptPath, "utf8");
    expect(raw).not.toContain(identity.email);
    expect(raw).not.toContain(identity.password);
    expect(raw).not.toContain("secret-user");
    expect(raw).not.toContain("secret-pass");
    expect(raw).not.toContain(PROJECT_REF);
    expect(raw).not.toContain(DATABASE_HOSTNAME);
    expect(raw).not.toContain(DATABASE_URL);
    expect(Object.keys(readReceipt(receiptPath)).sort()).toEqual(
      ["emailHash", "runId", "targetFingerprint", "tenantId", "userId", "version"].sort()
    );
  });

  it("changes the fingerprint when the normalized username changes", () => {
    const first = targetFingerprint(DATABASE_URL);
    const changedUsername = targetFingerprint(
      `postgresql://another:secret-pass@${DATABASE_HOSTNAME}:5432/fixture?sslmode=require`
    );
    expect(first).not.toBe(changedUsername);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(first).not.toContain(DATABASE_HOSTNAME);
  });

  it("uses interpreted percent-decoded username values", () => {
    expect(
      targetFingerprint("postgresql://fixture%2Duser:one@db.example.test/fixture")
    ).toBe(targetFingerprint("postgresql://fixture-user:two@db.example.test/fixture"));
  });

  it("excludes password and query from the fingerprint", () => {
    expect(
      targetFingerprint("postgresql://fixture-user:first@db.example.test/fixture?sslmode=require")
    ).toBe(
      targetFingerprint("postgresql://fixture-user:second@db.example.test/fixture?application_name=x")
    );
  });

  it("normalizes equivalent protocol, hostname, port, database and username values", () => {
    const encoded = targetFingerprint(
      "POSTGRES://%20fixture%2Duser%20:one@DB.EXAMPLE.TEST.:5432/%20fixture%20"
    );
    const normalized = targetFingerprint(
      "postgresql://fixture-user:two@db.example.test/fixture"
    );
    expect(encoded).toBe(normalized);
  });

  it("contains no adopt/update/name-selection or empty-delete fallback", () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const sources = ["provision-inbox-e2e.ts", "cleanup-inbox-e2e.ts"]
      .map((file) => fs.readFileSync(path.join(currentDir, file), "utf8"))
      .join("\n");
    expect(sources).not.toMatch(/\b(findFirst|upsert)\b|\.update\s*\(/);
    expect(sources).not.toMatch(/DevFlow Sales|Client 1|deleteMany\s*\(\s*\{\s*\}\s*\)/);
    expect(sources).not.toMatch(/\b(contains|startsWith)\s*:/);
  });
});

describe("safe inbox fixture provisioning", () => {
  it("rolls back all creates when provisioning fails", async () => {
    const receiptPath = tempPath();
    const state = { tenants: [] as string[], users: [] as string[] };
    const tx = {
      user: {
        findUnique: async () => null,
        create: async ({ data }: { data: { id: string } }) => state.users.push(data.id),
      },
      tenant: {
        create: async ({ data }: { data: { id: string } }) => state.tenants.push(data.id),
      },
    };
    const client = {
      $transaction: async (callback: (value: typeof tx) => Promise<unknown>) => {
        const snapshot = structuredClone(state);
        try {
          return await callback(tx);
        } catch (error) {
          state.tenants = snapshot.tenants;
          state.users = snapshot.users;
          throw error;
        }
      },
    };

    await expect(
      provisionInboxFixture({
        client: client as unknown as ProvisionClient,
        datasourceUrl: DATABASE_URL,
        receiptPath,
        afterTenantCreated: () => {
          throw new Error("forced rollback");
        },
      })
    ).rejects.toThrow("forced rollback");
    expect(state).toEqual({ tenants: [], users: [] });
    expect(fs.existsSync(receiptPath)).toBe(false);
  });

  it("aborts normalized global email collisions before any create", async () => {
    const receiptPath = tempPath();
    const creates = vi.fn();
    const findUnique = vi.fn(async () => ({ id: "preexisting" }));
    const identity = buildIdentity();
    identity.email = identity.email.toUpperCase();
    const tx = {
      user: {
        findUnique,
        create: creates,
      },
      tenant: { create: creates },
    };
    const client = {
      $transaction: async (callback: (value: typeof tx) => Promise<unknown>) => callback(tx),
    };
    await expect(
      provisionInboxFixture({
        client: client as unknown as ProvisionClient,
        datasourceUrl: DATABASE_URL,
        receiptPath,
        identity,
      })
    ).rejects.toThrow(/normalizado já existe/);
    expect(findUnique).toHaveBeenCalledWith({
      where: { email: identity.email.toLowerCase() },
      select: { id: true },
    });
    expect(creates).not.toHaveBeenCalled();
  });
});

describe("safe inbox fixture cleanup", () => {
  async function setup(overrides?: Parameters<typeof cleanupClient>[1]) {
    const receiptPath = tempPath();
    const { identity, receipt } = createReceipt();
    writeReceiptAtomic(receipt, receiptPath);
    const fake = cleanupClient(identity, overrides);
    return { receiptPath, identity, ...fake };
  }

  it("aborts before reads when the target fingerprint differs", async () => {
    const fixture = await setup();
    await expect(
      cleanupInboxFixture({
        client: fixture.client,
        datasourceUrl: "postgresql://x:y@other.example.test:5432/fixture",
        receiptPath: fixture.receiptPath,
      })
    ).rejects.toThrow(/target fingerprint/);
    expect(fixture.calls).toEqual([]);
    expect(fs.existsSync(fixture.receiptPath)).toBe(true);
  });

  it.each([
    "tenant id",
    "tenant name",
    "tenant internal",
    "user id",
    "user tenant",
    "user role",
    "user name",
  ])(
    "preserves the receipt on %s guard mismatch",
    async (guard) => {
    const fixture = await setup();
    const tenant = {
      id: fixture.identity.tenantId,
      name: fixture.identity.tenantName,
      isInternal: false,
      plan: "free",
    };
    const user = {
      id: fixture.identity.userId,
      tenantId: fixture.identity.tenantId,
      email: fixture.identity.email,
      name: fixture.identity.userName,
      role: fixture.identity.role as string,
    };
    if (guard === "tenant id") tenant.id = "wrong";
    if (guard === "tenant name") tenant.name = "wrong";
    if (guard === "tenant internal") tenant.isInternal = true;
    if (guard === "user id") user.id = "wrong";
    if (guard === "user tenant") user.tenantId = "wrong";
    if (guard === "user role") user.role = "operator";
    if (guard === "user name") user.name = "wrong";
    const fake = cleanupClient(fixture.identity, { tenant, user });
    await expect(
      cleanupInboxFixture({
        client: fake.client,
        datasourceUrl: DATABASE_URL,
        receiptPath: fixture.receiptPath,
      })
    ).rejects.toThrow(/Guard mismatch/);
    expect(fs.existsSync(fixture.receiptPath)).toBe(true);
    }
  );

  it("rejects an email hash mismatch", async () => {
    const fixture = await setup({
      user: {
        id: "unused",
        tenantId: "unused",
        email: "other@example.invalid",
        name: "unused",
        role: "manager",
      },
    });
    const expected = identityFromReceipt(readReceipt(fixture.receiptPath));
    const fake = cleanupClient(fixture.identity, {
      user: {
        id: fixture.identity.userId,
        tenantId: fixture.identity.tenantId,
        email: "other@example.invalid",
        name: expected.userName,
        role: expected.role,
      },
    });
    await expect(
      cleanupInboxFixture({
        client: fake.client,
        datasourceUrl: DATABASE_URL,
        receiptPath: fixture.receiptPath,
      })
    ).rejects.toThrow(/email hash/);
  });

  it("rejects a receipt hash that does not derive from runId", async () => {
    const fixture = await setup();
    const receipt = readReceipt(fixture.receiptPath);
    fs.writeFileSync(
      fixture.receiptPath,
      JSON.stringify({ ...receipt, emailHash: "a".repeat(64) }),
      "utf8"
    );
    await expect(
      cleanupInboxFixture({
        client: fixture.client,
        datasourceUrl: DATABASE_URL,
        receiptPath: fixture.receiptPath,
      })
    ).rejects.toThrow(/email hash derivation/);
    expect(fixture.calls).toEqual([]);
  });

  it("aborts before writes on an unexpected exact-owner audit", async () => {
    const fixture = await setup({ audits: [{ id: "audit-1", action: "logout" }] });
    await expect(
      cleanupInboxFixture({
        client: fixture.client,
        datasourceUrl: DATABASE_URL,
        receiptPath: fixture.receiptPath,
      })
    ).rejects.toThrow(/Unexpected audit action/);
    expect(fixture.calls.some((call) => call.kind.endsWith("deleteMany"))).toBe(false);
  });

  it("discovers sessions by exact userId and uses combined restrictive writes", async () => {
    const fixture = await setup();
    const result = await cleanupInboxFixture({
      client: fixture.client,
      datasourceUrl: DATABASE_URL,
      receiptPath: fixture.receiptPath,
    });
    expect(result).toEqual({
      auditsDeleted: 1,
      sessionsDeleted: 1,
      usersDeleted: 1,
      tenantsDeleted: 1,
    });
    expect(fixture.calls.find((call) => call.kind === "session.findMany")?.args).toEqual({
      where: { userId: fixture.identity.userId },
      select: { id: true },
    });
    expect(fixture.calls.find((call) => call.kind === "session.deleteMany")?.args).toEqual({
      where: { id: { in: ["session-owned"] }, userId: fixture.identity.userId },
    });
    expect(fixture.calls.find((call) => call.kind === "session.txCount")?.args).toEqual({
      where: { userId: fixture.identity.userId },
    });
    expect(fixture.calls.find((call) => call.kind === "audit.txCount")?.args).toEqual({
      where: { tenantId: fixture.identity.tenantId, userId: fixture.identity.userId },
    });
    expect(fixture.calls.find((call) => call.kind === "audit.deleteMany")?.args).toMatchObject({
      where: {
        id: { in: ["audit-owned"] },
        tenantId: fixture.identity.tenantId,
        userId: fixture.identity.userId,
      },
    });
    expect(fixture.calls.find((call) => call.kind === "user.deleteMany")?.args).toMatchObject({
      where: { id: fixture.identity.userId, tenantId: fixture.identity.tenantId },
    });
    expect(fs.existsSync(fixture.receiptPath)).toBe(false);
  });

  it("removes owned state and actually preserves another tenant and user", async () => {
    const receiptPath = tempPath();
    const { identity, receipt } = createReceipt();
    writeReceiptAtomic(receipt, receiptPath);
    const fixture = statefulCleanupClient(identity);
    await cleanupInboxFixture({
      client: fixture.client,
      datasourceUrl: DATABASE_URL,
      receiptPath,
    });
    expect(fixture.state.tenants.map((row) => row.id)).toEqual(["other-tenant"]);
    expect(fixture.state.users.map((row) => row.id)).toEqual(["other-user"]);
    expect(fixture.state.sessions.map((row) => row.id)).toEqual(["other-session"]);
    expect(fixture.state.audits.map((row) => row.id)).toEqual(["other-audit"]);
    expect(fs.existsSync(receiptPath)).toBe(false);
  });

  it("rolls back every delete when a residual exact-owner audit appears", async () => {
    const receiptPath = tempPath();
    const { identity, receipt } = createReceipt();
    writeReceiptAtomic(receipt, receiptPath);
    const fixture = statefulCleanupClient(identity, { injectLateAudit: true });
    await expect(
      cleanupInboxFixture({
        client: fixture.client,
        datasourceUrl: DATABASE_URL,
        receiptPath,
      })
    ).rejects.toThrow(/residual audit count/);
    expect(fixture.state.tenants.map((row) => row.id)).toEqual([
      identity.tenantId,
      "other-tenant",
    ]);
    expect(fixture.state.users.map((row) => row.id)).toEqual([
      identity.userId,
      "other-user",
    ]);
    expect(fixture.state.sessions.map((row) => row.id)).toEqual([
      "owned-session",
      "other-session",
    ]);
    expect(fixture.state.audits.map((row) => row.id)).toEqual([
      "owned-audit",
      "other-audit",
      "late-audit",
    ]);
    expect(fs.existsSync(receiptPath)).toBe(true);
  });

  it("rolls back every delete when a residual exact-user session appears", async () => {
    const receiptPath = tempPath();
    const { identity, receipt } = createReceipt();
    writeReceiptAtomic(receipt, receiptPath);
    const fixture = statefulCleanupClient(identity, { injectLateSession: true });
    await expect(
      cleanupInboxFixture({
        client: fixture.client,
        datasourceUrl: DATABASE_URL,
        receiptPath,
      })
    ).rejects.toThrow(/residual session count/);
    expect(fixture.state.tenants.some((row) => row.id === identity.tenantId)).toBe(true);
    expect(fixture.state.users.some((row) => row.id === identity.userId)).toBe(true);
    expect(fixture.state.sessions.map((row) => row.id)).toEqual([
      "owned-session",
      "other-session",
      "late-session",
    ]);
    expect(fs.existsSync(receiptPath)).toBe(true);
  });

  it("rolls back and preserves the receipt on an exact-count mismatch", async () => {
    const fixture = await setup({ deleteCount: { audit: 0 } });
    await expect(
      cleanupInboxFixture({
        client: fixture.client,
        datasourceUrl: DATABASE_URL,
        receiptPath: fixture.receiptPath,
      })
    ).rejects.toThrow(/audit delete count/);
    expect(fs.existsSync(fixture.receiptPath)).toBe(true);
  });

  it("validates receipt email ownership independently", () => {
    const { identity, receipt } = createReceipt();
    expect(hashEmail(identityFromReceipt(receipt).email)).toBe(receipt.emailHash);
    expect(receipt.emailHash).toBe(hashEmail(identity.email));
  });
});
