import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  acquireFixtureLock,
  buildIdentity,
  receiptFor,
  targetFingerprint,
  writeReceiptAtomic,
} from "./inbox-e2e-fixture";
import { cleanupInboxFixture, type CleanupClient } from "./cleanup-inbox-e2e";
import {
  REQUIRED_BRANCH,
  parseLegacyRecoveryArgs,
  recoverLegacyPidLockOnce,
  sha256Bytes,
  snapshotMarker,
} from "./inbox-e2e-recovery";

const DATABASE_URL = "postgresql://secret-user:secret-pass@db.example.test:5432/fixture";
const tempDirs: string[] = [];

function tempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "inbox-recovery-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

function createMarkers(dir: string, lockBody = "2000000001\n") {
  const identity = buildIdentity("abcdef0123456789abcdef0123456789");
  const receipt = receiptFor(identity, targetFingerprint(DATABASE_URL));
  const receiptPath = path.join(dir, "inbox-e2e-fixture.json");
  const lockPath = path.join(dir, "inbox-e2e-fixture.lock");
  writeReceiptAtomic(receipt, receiptPath);
  fs.writeFileSync(lockPath, lockBody, "utf8");
  return { identity, receipt, receiptPath, lockPath };
}

function fakeClient(identity: ReturnType<typeof buildIdentity>): CleanupClient & {
  $disconnect(): Promise<void>;
  state: { deleted: boolean };
} {
  const state = { deleted: false };
  const client = {
    state,
    async $disconnect() {},
    tenant: {
      async findUnique() {
        if (state.deleted) return null;
        return {
          id: identity.tenantId,
          name: identity.tenantName,
          isInternal: false,
          plan: "free",
        };
      },
      async count() {
        return state.deleted ? 0 : 1;
      },
    },
    user: {
      async findUnique() {
        if (state.deleted) return null;
        return {
          id: identity.userId,
          tenantId: identity.tenantId,
          email: identity.email,
          name: identity.userName,
          role: identity.role,
        };
      },
      async count() {
        return state.deleted ? 0 : 1;
      },
    },
    userSession: {
      async findMany() {
        return [];
      },
      async count() {
        return 0;
      },
    },
    auditLog: {
      async findMany() {
        return [];
      },
      async count() {
        return 0;
      },
    },
    async $transaction(callback: (tx: unknown) => Promise<unknown>) {
      const tx = {
        auditLog: {
          async deleteMany() {
            return { count: 0 };
          },
          async count() {
            return 0;
          },
        },
        userSession: {
          async deleteMany() {
            return { count: 0 };
          },
          async count() {
            return 0;
          },
        },
        user: {
          async deleteMany() {
            state.deleted = true;
            return { count: 1 };
          },
        },
        tenant: {
          async deleteMany() {
            state.deleted = true;
            return { count: 1 };
          },
        },
      };
      return callback(tx);
    },
  };
  return client as unknown as CleanupClient & {
    $disconnect(): Promise<void>;
    state: { deleted: boolean };
  };
}

describe("parseLegacyRecoveryArgs", () => {
  const digests = {
    receipt: "a".repeat(64),
    lock: "b".repeat(64),
    head: "c".repeat(40),
  };

  it("returns null without recover flag", () => {
    expect(parseLegacyRecoveryArgs([])).toBeNull();
  });

  it("requires all exceptional flags", () => {
    expect(() => parseLegacyRecoveryArgs(["--recover-legacy-pid-lock"])).toThrow(/ausente|incompleto|inválido/i);
  });

  it("rejects unknown and duplicate args", () => {
    expect(() =>
      parseLegacyRecoveryArgs([
        "--recover-legacy-pid-lock",
        "--expected-receipt-digest",
        digests.receipt,
        "--expected-lock-digest",
        digests.lock,
        "--expected-head",
        digests.head,
        "--accept-unprovable-legacy-link",
        "--nope",
      ])
    ).toThrow(/desconhecido/);
    expect(() =>
      parseLegacyRecoveryArgs([
        "--recover-legacy-pid-lock",
        "--recover-legacy-pid-lock",
        "--expected-receipt-digest",
        digests.receipt,
        "--expected-lock-digest",
        digests.lock,
        "--expected-head",
        digests.head,
        "--accept-unprovable-legacy-link",
      ])
    ).toThrow(/duplicado/);
  });

  it("parses a valid exceptional invocation", () => {
    const args = parseLegacyRecoveryArgs([
      "--recover-legacy-pid-lock",
      "--expected-receipt-digest",
      digests.receipt,
      "--expected-lock-digest",
      digests.lock,
      "--expected-head",
      digests.head,
      "--accept-unprovable-legacy-link",
    ]);
    expect(args?.expectedReceiptDigest).toBe(digests.receipt);
    expect(args?.expectedLockDigest).toBe(digests.lock);
    expect(args?.expectedHead).toBe(digests.head);
  });
});

describe("legacy pid-lock recovery", () => {
  it("aborts on digest mismatch before cleanup", async () => {
    const dir = tempDir();
    const { receiptPath, lockPath, identity } = createMarkers(dir, "2000000001\n");
    const receiptDigest = snapshotMarker(receiptPath).digest;
    const cleanup = vi.fn();
    await expect(
      recoverLegacyPidLockOnce({
        args: {
          recoverLegacyPidLock: true,
          expectedReceiptDigest: receiptDigest,
          expectedLockDigest: "d".repeat(64),
          expectedHead: "e".repeat(40),
          acceptUnprovableLegacyLink: true,
        },
        receiptPath,
        lockPath,
        claimPath: path.join(dir, "claim"),
        committedPath: path.join(dir, "committed"),
        takeoverPath: path.join(dir, "takeover"),
        getRepoGate: () => ({ branch: REQUIRED_BRANCH, head: "e".repeat(40), clean: true }),
        resolveDatasourceUrl: () => DATABASE_URL,
        cleanup,
        createClient: () => fakeClient(identity),
        isPortFree: async () => true,
      })
    ).rejects.toThrow(/Digest do lock divergente/);
    expect(cleanup).not.toHaveBeenCalled();
    expect(fs.existsSync(receiptPath)).toBe(true);
    expect(fs.existsSync(lockPath)).toBe(true);
  });

  it("rejects active lock pid", async () => {
    const dir = tempDir();
    const { receiptPath, lockPath, identity } = createMarkers(dir, `${process.pid}\n`);
    const receiptDigest = snapshotMarker(receiptPath).digest;
    const lockDigest = snapshotMarker(lockPath).digest;
    await expect(
      recoverLegacyPidLockOnce({
        args: {
          recoverLegacyPidLock: true,
          expectedReceiptDigest: receiptDigest,
          expectedLockDigest: lockDigest,
          expectedHead: "f".repeat(40),
          acceptUnprovableLegacyLink: true,
        },
        receiptPath,
        lockPath,
        claimPath: path.join(dir, "claim"),
        committedPath: path.join(dir, "committed"),
        takeoverPath: path.join(dir, "takeover"),
        getRepoGate: () => ({ branch: REQUIRED_BRANCH, head: "f".repeat(40), clean: true }),
        resolveDatasourceUrl: () => DATABASE_URL,
        createClient: () => fakeClient(identity),
        isPortFree: async () => true,
      })
    ).rejects.toThrow(/ainda está ativo/);
  });

  it("rejects structured lock format on exceptional path", async () => {
    const dir = tempDir();
    const structured = `${JSON.stringify({ version: 1, pid: 1, runId: "a".repeat(32), receiptDigest: "b".repeat(64) })}\n`;
    const { receiptPath, lockPath, identity } = createMarkers(dir, structured);
    const receiptDigest = snapshotMarker(receiptPath).digest;
    const lockDigest = snapshotMarker(lockPath).digest;
    await expect(
      recoverLegacyPidLockOnce({
        args: {
          recoverLegacyPidLock: true,
          expectedReceiptDigest: receiptDigest,
          expectedLockDigest: lockDigest,
          expectedHead: "1".repeat(40),
          acceptUnprovableLegacyLink: true,
        },
        receiptPath,
        lockPath,
        claimPath: path.join(dir, "claim"),
        committedPath: path.join(dir, "committed"),
        takeoverPath: path.join(dir, "takeover"),
        getRepoGate: () => ({ branch: REQUIRED_BRANCH, head: "1".repeat(40), clean: true }),
        resolveDatasourceUrl: () => DATABASE_URL,
        createClient: () => fakeClient(identity),
        isPortFree: async () => true,
      })
    ).rejects.toThrow(/PID-only/);
  });

  it("rejects second concurrent claim", async () => {
    const dir = tempDir();
    const { receiptPath, lockPath, identity } = createMarkers(dir, "1\n");
    const receiptDigest = snapshotMarker(receiptPath).digest;
    const lockDigest = snapshotMarker(lockPath).digest;
    fs.writeFileSync(
      path.join(dir, "claim"),
      `${JSON.stringify({
        version: 1,
        ownerNonce: "a".repeat(32),
        pid: process.pid,
        receiptDigest,
        lockDigest,
      })}\n`
    );
    await expect(
      recoverLegacyPidLockOnce({
        args: {
          recoverLegacyPidLock: true,
          expectedReceiptDigest: receiptDigest,
          expectedLockDigest: lockDigest,
          expectedHead: "2".repeat(40),
          acceptUnprovableLegacyLink: true,
        },
        receiptPath,
        lockPath,
        claimPath: path.join(dir, "claim"),
        committedPath: path.join(dir, "committed"),
        takeoverPath: path.join(dir, "takeover"),
        getRepoGate: () => ({ branch: REQUIRED_BRANCH, head: "2".repeat(40), clean: true }),
        resolveDatasourceUrl: () => DATABASE_URL,
        createClient: () => fakeClient(identity),
        isPortFree: async () => true,
      })
    ).rejects.toThrow(/Claim de recovery já está ativo/);
  });

  it("rejects fingerprint mismatch before client", async () => {
    const dir = tempDir();
    const { receiptPath, lockPath, identity } = createMarkers(dir, "1\n");
    const receiptDigest = snapshotMarker(receiptPath).digest;
    const lockDigest = snapshotMarker(lockPath).digest;
    const createClient = vi.fn(() => fakeClient(identity));
    await expect(
      recoverLegacyPidLockOnce({
        args: {
          recoverLegacyPidLock: true,
          expectedReceiptDigest: receiptDigest,
          expectedLockDigest: lockDigest,
          expectedHead: "3".repeat(40),
          acceptUnprovableLegacyLink: true,
        },
        receiptPath,
        lockPath,
        claimPath: path.join(dir, "claim"),
        committedPath: path.join(dir, "committed"),
        takeoverPath: path.join(dir, "takeover"),
        getRepoGate: () => ({ branch: REQUIRED_BRANCH, head: "3".repeat(40), clean: true }),
        resolveDatasourceUrl: () => DATABASE_URL,
        targetFingerprint: () => "0".repeat(64),
        createClient,
        isPortFree: async () => true,
      })
    ).rejects.toThrow(/fingerprint/);
    expect(createClient).not.toHaveBeenCalled();
  });

  it("rejects unexpected head", async () => {
    const dir = tempDir();
    const { receiptPath, lockPath, identity } = createMarkers(dir, "1\n");
    const receiptDigest = snapshotMarker(receiptPath).digest;
    const lockDigest = snapshotMarker(lockPath).digest;
    await expect(
      recoverLegacyPidLockOnce({
        args: {
          recoverLegacyPidLock: true,
          expectedReceiptDigest: receiptDigest,
          expectedLockDigest: lockDigest,
          expectedHead: "4".repeat(40),
          acceptUnprovableLegacyLink: true,
        },
        receiptPath,
        lockPath,
        claimPath: path.join(dir, "claim"),
        committedPath: path.join(dir, "committed"),
        takeoverPath: path.join(dir, "takeover"),
        getRepoGate: () => ({ branch: REQUIRED_BRANCH, head: "5".repeat(40), clean: true }),
        resolveDatasourceUrl: () => DATABASE_URL,
        createClient: () => fakeClient(identity),
        isPortFree: async () => true,
      })
    ).rejects.toThrow(/HEAD/);
  });

  it("preserves markers when cleanup fails", async () => {
    const dir = tempDir();
    const { receiptPath, lockPath, identity } = createMarkers(dir, "1\n");
    const receiptDigest = snapshotMarker(receiptPath).digest;
    const lockDigest = snapshotMarker(lockPath).digest;
    await expect(
      recoverLegacyPidLockOnce({
        args: {
          recoverLegacyPidLock: true,
          expectedReceiptDigest: receiptDigest,
          expectedLockDigest: lockDigest,
          expectedHead: "6".repeat(40),
          acceptUnprovableLegacyLink: true,
        },
        receiptPath,
        lockPath,
        claimPath: path.join(dir, "claim"),
        committedPath: path.join(dir, "committed"),
        takeoverPath: path.join(dir, "takeover"),
        getRepoGate: () => ({ branch: REQUIRED_BRANCH, head: "6".repeat(40), clean: true }),
        resolveDatasourceUrl: () => DATABASE_URL,
        createClient: () => fakeClient(identity),
        cleanup: async () => {
          throw new Error("forced cleanup failure");
        },
        isPortFree: async () => true,
      })
    ).rejects.toThrow(/forced cleanup failure/);
    expect(fs.existsSync(receiptPath)).toBe(true);
    expect(fs.existsSync(lockPath)).toBe(true);
    expect(fs.existsSync(path.join(dir, "claim"))).toBe(true);
  });

  it("removes markers only after successful cleanup", async () => {
    const dir = tempDir();
    const { receiptPath, lockPath, identity } = createMarkers(dir, "1\n");
    const receiptDigest = snapshotMarker(receiptPath).digest;
    const lockDigest = snapshotMarker(lockPath).digest;
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const result = await recoverLegacyPidLockOnce({
      args: {
        recoverLegacyPidLock: true,
        expectedReceiptDigest: receiptDigest,
        expectedLockDigest: lockDigest,
        expectedHead: "7".repeat(40),
        acceptUnprovableLegacyLink: true,
      },
      receiptPath,
      lockPath,
      claimPath: path.join(dir, "claim"),
      committedPath: path.join(dir, "committed"),
      takeoverPath: path.join(dir, "takeover"),
      getRepoGate: () => ({ branch: REQUIRED_BRANCH, head: "7".repeat(40), clean: true }),
      resolveDatasourceUrl: () => DATABASE_URL,
      createClient: () => fakeClient(identity),
      cleanup: async (options) =>
        cleanupInboxFixture({
          ...options,
          removeReceiptOnSuccess: false,
        }),
      isPortFree: async () => true,
    });
    expect(result.mode).toBe("cleanup");
    expect(fs.existsSync(receiptPath)).toBe(false);
    expect(fs.existsSync(lockPath)).toBe(false);
    expect(fs.existsSync(path.join(dir, "claim"))).toBe(false);
    expect(fs.existsSync(path.join(dir, "committed"))).toBe(false);
    const logged = info.mock.calls.map((call) => String(call[0])).join("\n");
    expect(logged).not.toContain(receiptDigest);
    expect(logged).not.toContain(lockDigest);
  });

  it("resumes from committed marker without cleanup", async () => {
    const dir = tempDir();
    const { receiptPath, lockPath, identity } = createMarkers(dir, "1\n");
    const receiptDigest = snapshotMarker(receiptPath).digest;
    const lockDigest = snapshotMarker(lockPath).digest;
    const ownerNonce = "abcd".repeat(8);
    fs.writeFileSync(
      path.join(dir, "claim"),
      `${JSON.stringify({
        version: 1,
        ownerNonce,
        pid: 1,
        receiptDigest,
        lockDigest,
      })}\n`
    );
    fs.writeFileSync(
      path.join(dir, "committed"),
      `${JSON.stringify({
        version: 1,
        ownerNonce,
        receiptDigest,
        lockDigest,
        dbCommitted: true,
      })}\n`
    );
    const cleanup = vi.fn();
    const result = await recoverLegacyPidLockOnce({
      args: {
        recoverLegacyPidLock: true,
        expectedReceiptDigest: receiptDigest,
        expectedLockDigest: lockDigest,
        expectedHead: "8".repeat(40),
        acceptUnprovableLegacyLink: true,
      },
      receiptPath,
      lockPath,
      claimPath: path.join(dir, "claim"),
      committedPath: path.join(dir, "committed"),
      takeoverPath: path.join(dir, "takeover"),
      getRepoGate: () => ({ branch: REQUIRED_BRANCH, head: "8".repeat(40), clean: true }),
      resolveDatasourceUrl: () => DATABASE_URL,
      createClient: () => fakeClient(identity),
      cleanup,
      isPortFree: async () => true,
    });
    expect(result.mode).toBe("resume");
    expect(cleanup).not.toHaveBeenCalled();
    expect(fs.existsSync(receiptPath)).toBe(false);
    expect(fs.existsSync(lockPath)).toBe(false);
  });

  it("aborts when marker mutates after claim", async () => {
    const dir = tempDir();
    const { receiptPath, lockPath, identity } = createMarkers(dir, "1\n");
    const receiptDigest = snapshotMarker(receiptPath).digest;
    const lockDigest = snapshotMarker(lockPath).digest;
    let mutated = false;
    const originalOpen = fs.openSync.bind(fs);
    const spy = vi.spyOn(fs, "openSync").mockImplementation((file, flags, mode) => {
      const fd = originalOpen(file as fs.PathLike, flags as fs.OpenMode, mode as fs.Mode);
      if (!mutated && String(file).endsWith("claim") && String(flags).includes("wx")) {
        mutated = true;
        fs.appendFileSync(lockPath, "9");
      }
      return fd;
    });
    await expect(
      recoverLegacyPidLockOnce({
        args: {
          recoverLegacyPidLock: true,
          expectedReceiptDigest: receiptDigest,
          expectedLockDigest: lockDigest,
          expectedHead: "9".repeat(40),
          acceptUnprovableLegacyLink: true,
        },
        receiptPath,
        lockPath,
        claimPath: path.join(dir, "claim"),
        committedPath: path.join(dir, "committed"),
        takeoverPath: path.join(dir, "takeover"),
        getRepoGate: () => ({ branch: REQUIRED_BRANCH, head: "9".repeat(40), clean: true }),
        resolveDatasourceUrl: () => DATABASE_URL,
        createClient: () => fakeClient(identity),
        isPortFree: async () => true,
      })
    ).rejects.toThrow(/mudou|divergente/i);
    spy.mockRestore();
    expect(fs.existsSync(receiptPath)).toBe(true);
  });

  it("keeps normal cleanup refusal of an existing lock", () => {
    const dir = tempDir();
    const lockPath = path.join(dir, "fixture.lock");
    const lock = acquireFixtureLock(lockPath);
    expect(() => acquireFixtureLock(lockPath)).toThrow(/execução ou limpeza/);
    lock.release();
  });

  it("sha256Bytes is stable for fixture bytes", () => {
    const bytes = Buffer.from("fixture\n", "utf8");
    expect(sha256Bytes(bytes)).toMatch(/^[a-f0-9]{64}$/);
    expect(sha256Bytes(bytes)).toBe(sha256Bytes(bytes));
  });
});
