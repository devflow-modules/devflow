import { createHash, randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const FIXTURE_VERSION = 1 as const;
export const FIXTURE_ROLE = "manager";
export const AUDIT_ACTION_ALLOWLIST = ["login_success"] as const;

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
export const APP_ROOT = path.resolve(scriptDir, "../..");
export const AUTH_DIR = path.join(APP_ROOT, "tests", ".auth");
export const RECEIPT_PATH = path.join(AUTH_DIR, "inbox-e2e-fixture.json");
export const LOCK_PATH = path.join(AUTH_DIR, "inbox-e2e-fixture.lock");

export type FixtureReceipt = {
  version: typeof FIXTURE_VERSION;
  runId: string;
  tenantId: string;
  userId: string;
  emailHash: string;
  targetFingerprint: string;
};

export type FixtureIdentity = {
  runId: string;
  tenantId: string;
  userId: string;
  email: string;
  emailHash: string;
  password: string;
  tenantName: string;
  userName: string;
  role: typeof FIXTURE_ROLE;
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function hashEmail(email: string): string {
  return sha256(normalizeEmail(email));
}

export function createRunId(): string {
  return randomUUID().replaceAll("-", "");
}

export function abbreviatedRunId(runId: string): string {
  return runId.slice(0, 8);
}

export function buildIdentity(runId = createRunId()): FixtureIdentity {
  if (!/^[a-f0-9]{32}$/i.test(runId)) {
    throw new Error("runId inválido");
  }
  const short = abbreviatedRunId(runId).toLowerCase();
  const email = `inbox-e2e-${runId.toLowerCase()}@example.invalid`;
  return {
    runId: runId.toLowerCase(),
    tenantId: randomUUID(),
    userId: randomUUID(),
    email,
    emailHash: hashEmail(email),
    password: randomBytes(24).toString("base64url"),
    tenantName: `Inbox E2E ${short}`,
    userName: `Inbox E2E Manager ${short}`,
    role: FIXTURE_ROLE,
  };
}

export function identityFromReceipt(receipt: FixtureReceipt): Omit<FixtureIdentity, "password"> {
  const runId = receipt.runId.toLowerCase();
  const short = abbreviatedRunId(runId);
  const email = `inbox-e2e-${runId}@example.invalid`;
  return {
    runId,
    tenantId: receipt.tenantId,
    userId: receipt.userId,
    email,
    emailHash: hashEmail(email),
    tenantName: `Inbox E2E ${short}`,
    userName: `Inbox E2E Manager ${short}`,
    role: FIXTURE_ROLE,
  };
}

export function targetFingerprint(datasourceUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(datasourceUrl);
  } catch {
    throw new Error("Target de banco inválido");
  }
  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    throw new Error("Target de banco não é PostgreSQL");
  }
  const database = parsed.pathname.replace(/^\/+/, "");
  if (!parsed.hostname || !database) {
    throw new Error("Target de banco incompleto");
  }
  // O digest inclui apenas endpoint e database; nunca username, password, query ou URL integral.
  return sha256(
    JSON.stringify({
      protocol: parsed.protocol,
      hostname: parsed.hostname.toLowerCase(),
      port: parsed.port || "5432",
      database,
    })
  );
}

export function resolveDatasourceUrl(env: NodeJS.ProcessEnv = process.env): string {
  const value = env.WHATSAPP_DIRECT_URL?.trim() || env.WHATSAPP_DATABASE_URL?.trim();
  if (!value) throw new Error("Defina WHATSAPP_DIRECT_URL ou WHATSAPP_DATABASE_URL");
  return value;
}

export function receiptFor(identity: FixtureIdentity, fingerprint: string): FixtureReceipt {
  return {
    version: FIXTURE_VERSION,
    runId: identity.runId,
    tenantId: identity.tenantId,
    userId: identity.userId,
    emailHash: identity.emailHash,
    targetFingerprint: fingerprint,
  };
}

export function validateReceipt(value: unknown): FixtureReceipt {
  if (!value || typeof value !== "object") throw new Error("Recibo inválido");
  const row = value as Record<string, unknown>;
  const allowed = ["version", "runId", "tenantId", "userId", "emailHash", "targetFingerprint"];
  if (Object.keys(row).some((key) => !allowed.includes(key))) {
    throw new Error("Recibo contém campos não autorizados");
  }
  if (
    row.version !== FIXTURE_VERSION ||
    typeof row.runId !== "string" ||
    !/^[a-f0-9]{32}$/i.test(row.runId) ||
    typeof row.tenantId !== "string" ||
    !row.tenantId ||
    typeof row.userId !== "string" ||
    !row.userId ||
    typeof row.emailHash !== "string" ||
    !/^[a-f0-9]{64}$/i.test(row.emailHash) ||
    typeof row.targetFingerprint !== "string" ||
    !/^[a-f0-9]{64}$/i.test(row.targetFingerprint)
  ) {
    throw new Error("Recibo inválido");
  }
  return row as FixtureReceipt;
}

export function readReceipt(receiptPath = RECEIPT_PATH): FixtureReceipt {
  const text = fs.readFileSync(receiptPath, "utf8");
  return validateReceipt(JSON.parse(text) as unknown);
}

export function writeReceiptAtomic(receipt: FixtureReceipt, receiptPath = RECEIPT_PATH): void {
  fs.mkdirSync(path.dirname(receiptPath), { recursive: true, mode: 0o700 });
  if (fs.existsSync(receiptPath)) throw new Error("Já existe um recibo ativo");
  const tempPath = `${receiptPath}.${process.pid}.${randomUUID()}.tmp`;
  let fd: number | undefined;
  try {
    fd = fs.openSync(tempPath, "wx", 0o600);
    fs.writeFileSync(fd, `${JSON.stringify(validateReceipt(receipt))}\n`, "utf8");
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = undefined;
    fs.renameSync(tempPath, receiptPath);
    try {
      fs.chmodSync(receiptPath, 0o600);
    } catch {
      // Alguns filesystems/Windows não implementam permissões POSIX.
    }
  } catch (error) {
    if (fd !== undefined) fs.closeSync(fd);
    try {
      fs.unlinkSync(tempPath);
    } catch {
      // O temporário pode não ter sido criado ou já ter sido renomeado.
    }
    throw error;
  }
}

export function removeReceipt(receiptPath = RECEIPT_PATH): void {
  fs.unlinkSync(receiptPath);
}

export type FixtureLock = { release(): void };

export function acquireFixtureLock(lockPath = LOCK_PATH): FixtureLock {
  fs.mkdirSync(path.dirname(lockPath), { recursive: true, mode: 0o700 });
  let fd: number;
  try {
    fd = fs.openSync(lockPath, "wx", 0o600);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "EEXIST") throw new Error("Outra execução ou limpeza está ativa");
    throw error;
  }
  fs.writeFileSync(fd, String(process.pid), "utf8");
  fs.fsyncSync(fd);
  let released = false;
  return {
    release() {
      if (released) return;
      released = true;
      fs.closeSync(fd);
      fs.unlinkSync(lockPath);
    },
  };
}

export function maskedId(value: string): string {
  return value.length <= 8 ? "********" : `${value.slice(0, 4)}…${value.slice(-4)}`;
}
