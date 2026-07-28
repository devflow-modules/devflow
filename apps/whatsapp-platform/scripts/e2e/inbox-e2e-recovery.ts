import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import {
  APP_ROOT,
  AUTH_DIR,
  LOCK_PATH,
  RECEIPT_PATH,
  abbreviatedRunId,
  targetFingerprint,
  validateReceipt,
  type FixtureReceipt,
} from "./inbox-e2e-fixture";
import { resolveInboxE2EEnvironment } from "./inbox-e2e-environment";
import type {
  CleanupClient,
  CleanupOptions,
  CleanupResult,
} from "./cleanup-inbox-e2e";

export const RECOVERY_CLAIM_PATH = path.join(AUTH_DIR, "inbox-e2e-fixture.recovery-claim");
export const RECOVERY_COMMITTED_PATH = path.join(
  AUTH_DIR,
  "inbox-e2e-fixture.recovery-committed"
);
export const RECOVERY_TAKEOVER_PATH = path.join(
  AUTH_DIR,
  "inbox-e2e-fixture.recovery-takeover"
);

export const REQUIRED_BRANCH = "test/whatsapp-client-1-inbox-contracts";

const HEX64 = /^[a-f0-9]{64}$/i;
const HEX40 = /^[a-f0-9]{40}$/i;
const PID_ONLY = /^\d+\s*$/;

export type LegacyRecoveryArgs = {
  recoverLegacyPidLock: true;
  expectedReceiptDigest: string;
  expectedLockDigest: string;
  expectedHead: string;
  acceptUnprovableLegacyLink: true;
};

export type RepoGate = {
  branch: string;
  head: string;
  clean: boolean;
};

export type MarkerSnapshot = {
  bytes: Buffer;
  digest: string;
  dev: bigint;
  ino: bigint;
  nlink: number;
  isFile: boolean;
};

export type RecoveryClaimRecord = {
  version: 1;
  ownerNonce: string;
  pid: number;
  receiptDigest: string;
  lockDigest: string;
};

export type RecoveryCommittedRecord = {
  version: 1;
  ownerNonce: string;
  receiptDigest: string;
  lockDigest: string;
  dbCommitted: true;
};

export type RecoverLegacyOptions = {
  args: LegacyRecoveryArgs;
  receiptPath?: string;
  lockPath?: string;
  claimPath?: string;
  committedPath?: string;
  takeoverPath?: string;
  repoRoot?: string;
  getRepoGate?: () => RepoGate;
  resolveDatasourceUrl?: () => string;
  targetFingerprint?: (url: string) => string;
  cleanup?: (options: CleanupOptions) => Promise<CleanupResult>;
  createClient?: (datasourceUrl: string) => CleanupClient & { $disconnect(): Promise<void> };
  isPortFree?: (port: number) => Promise<boolean>;
  nowPid?: number;
};

function fail(message: string): never {
  throw new Error(message);
}

export function sha256Bytes(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function digestsEqual(actual: string, expected: string): boolean {
  const a = Buffer.from(actual.toLowerCase(), "utf8");
  const b = Buffer.from(expected.toLowerCase(), "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function parseLegacyRecoveryArgs(argv: string[]): LegacyRecoveryArgs | null {
  if (!argv.includes("--recover-legacy-pid-lock")) return null;

  const seen = new Set<string>();
  const values: Record<string, string> = {};
  let accept = false;

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--recover-legacy-pid-lock") {
      if (seen.has(token)) fail("Argumento duplicado");
      seen.add(token);
      continue;
    }
    if (token === "--accept-unprovable-legacy-link") {
      if (seen.has(token)) fail("Argumento duplicado");
      seen.add(token);
      accept = true;
      continue;
    }
    if (
      token === "--expected-receipt-digest" ||
      token === "--expected-lock-digest" ||
      token === "--expected-head"
    ) {
      if (seen.has(token)) fail("Argumento duplicado");
      seen.add(token);
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) fail("Argumento incompleto");
      values[token] = value;
      i += 1;
      continue;
    }
    if (token.startsWith("--")) fail("Argumento desconhecido");
  }

  if (!accept) fail("Confirmação excepcional ausente");
  const expectedReceiptDigest = values["--expected-receipt-digest"];
  const expectedLockDigest = values["--expected-lock-digest"];
  const expectedHead = values["--expected-head"];
  if (!expectedReceiptDigest || !HEX64.test(expectedReceiptDigest)) {
    fail("Digest do recibo inválido");
  }
  if (!expectedLockDigest || !HEX64.test(expectedLockDigest)) {
    fail("Digest do lock inválido");
  }
  if (!expectedHead || !HEX40.test(expectedHead)) {
    fail("HEAD esperado inválido");
  }

  return {
    recoverLegacyPidLock: true,
    expectedReceiptDigest: expectedReceiptDigest.toLowerCase(),
    expectedLockDigest: expectedLockDigest.toLowerCase(),
    expectedHead: expectedHead.toLowerCase(),
    acceptUnprovableLegacyLink: true,
  };
}

export function defaultRepoGate(repoRoot: string): RepoGate {
  const branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    cwd: repoRoot,
    encoding: "utf8",
  }).trim();
  const head = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: repoRoot,
    encoding: "utf8",
  })
    .trim()
    .toLowerCase();
  const porcelain = execFileSync("git", ["status", "--porcelain"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  return { branch, head, clean: porcelain.trim().length === 0 };
}

function assertProcessAbsent(pid: number): void {
  try {
    process.kill(pid, 0);
    fail("PID do lock ainda está ativo");
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.message === "PID do lock ainda está ativo") throw error;
    if (err.code !== "ESRCH") throw error;
  }
}

export function parseLegacyPidOnlyLock(raw: Buffer): number {
  const text = raw.toString("utf8");
  if (!PID_ONLY.test(text)) fail("Lock não é legado PID-only");
  const pid = Number(text.trim());
  if (!Number.isInteger(pid) || pid <= 0) fail("PID do lock inválido");
  return pid;
}

export function snapshotMarker(filePath: string): MarkerSnapshot {
  const fd = fs.openSync(filePath, "r");
  try {
    const stat = fs.fstatSync(fd, { bigint: true });
    if (!stat.isFile()) fail("Marker não é arquivo regular");
    if (stat.nlink !== 1n) fail("Marker com hardlink não autorizado");
    if (stat.dev === 0n || stat.ino === 0n) fail("Identidade de inode inválida");
    const bytes = Buffer.alloc(Number(stat.size));
    let offset = 0;
    while (offset < bytes.length) {
      const read = fs.readSync(fd, bytes, offset, bytes.length - offset, offset);
      if (read === 0) break;
      offset += read;
    }
    if (offset !== bytes.length) fail("Leitura incompleta do marker");
    return {
      bytes,
      digest: sha256Bytes(bytes),
      dev: stat.dev,
      ino: stat.ino,
      nlink: Number(stat.nlink),
      isFile: true,
    };
  } finally {
    fs.closeSync(fd);
  }
}

function lstatRegularOrFail(filePath: string): void {
  const stat = fs.lstatSync(filePath);
  if (stat.isSymbolicLink()) fail("Marker é symlink");
  if (!stat.isFile()) fail("Marker não é arquivo regular");
}

function writeExclusiveJson(filePath: string, payload: unknown): { fd: number } {
  const fd = fs.openSync(filePath, "wx", 0o600);
  const body = Buffer.from(`${JSON.stringify(payload)}\n`, "utf8");
  fs.writeSync(fd, body, 0, body.length, 0);
  fs.fsyncSync(fd);
  return { fd };
}

function readClaim(filePath: string): RecoveryClaimRecord {
  const raw = JSON.parse(fs.readFileSync(filePath, "utf8")) as RecoveryClaimRecord;
  if (
    raw.version !== 1 ||
    typeof raw.ownerNonce !== "string" ||
    !/^[a-f0-9]{32}$/i.test(raw.ownerNonce) ||
    typeof raw.pid !== "number" ||
    !Number.isInteger(raw.pid) ||
    raw.pid <= 0 ||
    typeof raw.receiptDigest !== "string" ||
    !HEX64.test(raw.receiptDigest) ||
    typeof raw.lockDigest !== "string" ||
    !HEX64.test(raw.lockDigest)
  ) {
    fail("Claim inválido");
  }
  return {
    version: 1,
    ownerNonce: raw.ownerNonce.toLowerCase(),
    pid: raw.pid,
    receiptDigest: raw.receiptDigest.toLowerCase(),
    lockDigest: raw.lockDigest.toLowerCase(),
  };
}

function readCommitted(filePath: string): RecoveryCommittedRecord {
  const raw = JSON.parse(fs.readFileSync(filePath, "utf8")) as RecoveryCommittedRecord;
  if (
    raw.version !== 1 ||
    typeof raw.ownerNonce !== "string" ||
    !/^[a-f0-9]{32}$/i.test(raw.ownerNonce) ||
    typeof raw.receiptDigest !== "string" ||
    !HEX64.test(raw.receiptDigest) ||
    typeof raw.lockDigest !== "string" ||
    !HEX64.test(raw.lockDigest) ||
    raw.dbCommitted !== true
  ) {
    fail("Committed marker inválido");
  }
  return {
    version: 1,
    ownerNonce: raw.ownerNonce.toLowerCase(),
    receiptDigest: raw.receiptDigest.toLowerCase(),
    lockDigest: raw.lockDigest.toLowerCase(),
    dbCommitted: true,
  };
}

async function defaultIsPortFree(port: number): Promise<boolean> {
  return await new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

function acquireClaim(options: {
  claimPath: string;
  takeoverPath: string;
  receiptDigest: string;
  lockDigest: string;
  nowPid: number;
}): { fd: number; record: RecoveryClaimRecord } {
  const create = (): { fd: number; record: RecoveryClaimRecord } => {
    const record: RecoveryClaimRecord = {
      version: 1,
      ownerNonce: randomBytes(16).toString("hex"),
      pid: options.nowPid,
      receiptDigest: options.receiptDigest,
      lockDigest: options.lockDigest,
    };
    const { fd } = writeExclusiveJson(options.claimPath, record);
    return { fd, record };
  };

  try {
    return create();
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "EEXIST") throw error;
  }

  const existing = readClaim(options.claimPath);
  try {
    process.kill(existing.pid, 0);
    fail("Claim de recovery já está ativo");
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.message === "Claim de recovery já está ativo") throw error;
    if (err.code !== "ESRCH") throw error;
  }

  let takeoverFd: number | undefined;
  try {
    takeoverFd = fs.openSync(options.takeoverPath, "wx", 0o600);
    fs.writeSync(
      takeoverFd,
      Buffer.from(`${JSON.stringify({ version: 1, pid: options.nowPid })}\n`, "utf8"),
      0,
      undefined,
      0
    );
    fs.fsyncSync(takeoverFd);
    const still = readClaim(options.claimPath);
    if (still.ownerNonce !== existing.ownerNonce || still.pid !== existing.pid) {
      fail("Claim mudou durante takeover");
    }
    assertProcessAbsent(still.pid);
    fs.unlinkSync(options.claimPath);
    return create();
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "EEXIST") fail("Takeover de claim concorrente");
    throw error;
  } finally {
    if (takeoverFd !== undefined) {
      try {
        fs.closeSync(takeoverFd);
      } catch {
        // ignore
      }
      try {
        fs.unlinkSync(options.takeoverPath);
      } catch {
        // only creator should remove; ignore races
      }
    }
  }
}

function revalidateSnapshot(
  filePath: string,
  expected: MarkerSnapshot,
  expectedDigest: string
): MarkerSnapshot {
  const next = snapshotMarker(filePath);
  if (next.dev !== expected.dev || next.ino !== expected.ino) {
    fail("Identidade do marker mudou após claim");
  }
  if (!digestsEqual(next.digest, expectedDigest)) {
    fail("Digest do marker divergente após claim");
  }
  return next;
}

function unlinkIfExists(filePath: string): void {
  try {
    fs.unlinkSync(filePath);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") throw error;
  }
}

export async function recoverLegacyPidLockOnce(
  options: RecoverLegacyOptions
): Promise<{ mode: "cleanup" | "resume"; runIdAbbreviated: string }> {
  if (!options.args.acceptUnprovableLegacyLink) {
    fail("Confirmação excepcional ausente");
  }

  const receiptPath = options.receiptPath ?? RECEIPT_PATH;
  const lockPath = options.lockPath ?? LOCK_PATH;
  const claimPath = options.claimPath ?? RECOVERY_CLAIM_PATH;
  const committedPath = options.committedPath ?? RECOVERY_COMMITTED_PATH;
  const takeoverPath = options.takeoverPath ?? RECOVERY_TAKEOVER_PATH;
  const repoRoot = options.repoRoot ?? path.resolve(APP_ROOT, "../..");
  const nowPid = options.nowPid ?? process.pid;
  const getRepoGate = options.getRepoGate ?? (() => defaultRepoGate(repoRoot));
  const isPortFree = options.isPortFree ?? defaultIsPortFree;

  const gate = getRepoGate();
  if (gate.branch !== REQUIRED_BRANCH) fail("Branch não autorizada para recovery legado");
  if (!digestsEqual(gate.head, options.args.expectedHead)) {
    fail("HEAD não corresponde à autorização");
  }
  if (!gate.clean) fail("Working tree não está limpa");

  if (!(await isPortFree(3099))) fail("Porta 3099 ocupada");

  // Resume path: committed marker present → finalize only.
  if (fs.existsSync(committedPath)) {
    if (!fs.existsSync(claimPath)) fail("Committed sem claim");
    const claim = readClaim(claimPath);
    const committed = readCommitted(committedPath);
    if (
      claim.ownerNonce !== committed.ownerNonce ||
      !digestsEqual(claim.receiptDigest, committed.receiptDigest) ||
      !digestsEqual(claim.lockDigest, committed.lockDigest) ||
      !digestsEqual(committed.receiptDigest, options.args.expectedReceiptDigest) ||
      !digestsEqual(committed.lockDigest, options.args.expectedLockDigest)
    ) {
      fail("Committed não corresponde ao snapshot autorizado");
    }
    unlinkIfExists(receiptPath);
    unlinkIfExists(lockPath);
    unlinkIfExists(claimPath);
    unlinkIfExists(committedPath);
    unlinkIfExists(takeoverPath);
    return { mode: "resume", runIdAbbreviated: "********" };
  }

  if (!fs.existsSync(receiptPath) || !fs.existsSync(lockPath)) {
    fail("Markers ausentes para recovery legado");
  }
  lstatRegularOrFail(receiptPath);
  lstatRegularOrFail(lockPath);

  const receiptSnap = snapshotMarker(receiptPath);
  const lockSnap = snapshotMarker(lockPath);
  if (!digestsEqual(receiptSnap.digest, options.args.expectedReceiptDigest)) {
    fail("Digest do recibo divergente");
  }
  if (!digestsEqual(lockSnap.digest, options.args.expectedLockDigest)) {
    fail("Digest do lock divergente");
  }

  const receipt = validateReceipt(JSON.parse(receiptSnap.bytes.toString("utf8")) as unknown);
  const orphanPid = parseLegacyPidOnlyLock(lockSnap.bytes);
  assertProcessAbsent(orphanPid);

  const datasourceUrl =
    options.resolveDatasourceUrl?.() ?? resolveInboxE2EEnvironment().datasourceUrl;
  const fingerprint =
    options.targetFingerprint?.(datasourceUrl) ?? targetFingerprint(datasourceUrl);
  if (!digestsEqual(fingerprint, receipt.targetFingerprint)) {
    fail("Target fingerprint divergente");
  }

  let claimFd: number | undefined;
  let claim: RecoveryClaimRecord | undefined;
  try {
    const acquired = acquireClaim({
      claimPath,
      takeoverPath,
      receiptDigest: options.args.expectedReceiptDigest,
      lockDigest: options.args.expectedLockDigest,
      nowPid,
    });
    claimFd = acquired.fd;
    claim = acquired.record;

    revalidateSnapshot(receiptPath, receiptSnap, options.args.expectedReceiptDigest);
    revalidateSnapshot(lockPath, lockSnap, options.args.expectedLockDigest);

    const heldLock = {
      release() {},
      bindReceipt(_receipt: FixtureReceipt) {},
    };

    const { cleanupInboxFixture } = await import("./cleanup-inbox-e2e");
    const cleanup =
      options.cleanup ??
      ((cleanupOptions: CleanupOptions) => cleanupInboxFixture(cleanupOptions));

    let client: (CleanupClient & { $disconnect(): Promise<void> }) | undefined;
    try {
      if (options.createClient) {
        client = options.createClient(datasourceUrl);
      } else {
        const { PrismaClient } = await import("../../src/generated/prisma-whatsapp");
        client = new PrismaClient({
          datasources: { db: { url: datasourceUrl } },
        }) as unknown as CleanupClient & { $disconnect(): Promise<void> };
      }

      await cleanup({
        client,
        datasourceUrl,
        receiptPath,
        heldLock,
        validatedReceipt: receipt,
        removeReceiptOnSuccess: false,
      });
    } finally {
      if (client) {
        try {
          await client.$disconnect();
        } catch {
          fail("Disconnect falhou; markers preservados");
        }
      }
    }

    const committed: RecoveryCommittedRecord = {
      version: 1,
      ownerNonce: claim.ownerNonce,
      receiptDigest: claim.receiptDigest,
      lockDigest: claim.lockDigest,
      dbCommitted: true,
    };
    const committedWrite = writeExclusiveJson(committedPath, committed);
    fs.closeSync(committedWrite.fd);

    // Final marker removal only after DB success + committed marker.
    unlinkIfExists(receiptPath);
    unlinkIfExists(lockPath);
    if (claimFd !== undefined) {
      fs.closeSync(claimFd);
      claimFd = undefined;
    }
    unlinkIfExists(claimPath);
    unlinkIfExists(committedPath);
    unlinkIfExists(takeoverPath);

    console.info(
      `[inbox-e2e-recovery:${abbreviatedRunId(receipt.runId)}] legacy pid-lock recovery complete`
    );
    return { mode: "cleanup", runIdAbbreviated: abbreviatedRunId(receipt.runId) };
  } catch (error) {
    if (claimFd !== undefined) {
      try {
        fs.closeSync(claimFd);
      } catch {
        // preserve claim file for inspection
      }
    }
    throw error;
  }
}

export function isLegacyRecoveryInvocation(argv: string[] = process.argv.slice(2)): boolean {
  return argv.includes("--recover-legacy-pid-lock");
}
