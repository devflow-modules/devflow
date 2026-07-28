import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { APP_ROOT } from "./inbox-e2e-fixture";

export const E2E_ARTIFACTS_ROOT = path.join(APP_ROOT, "tests", ".auth", "inbox-safe");
export const ISOLATION_REPORT_VERSION = 1 as const;
export const ISOLATION_PRODUCERS = ["global-setup", "test-worker"] as const;
const PROCESS_INSTANCE_NONCE = randomBytes(16).toString("hex");

export const ISOLATION_CATEGORIES = [
  "authorizedBackendLogin",
  "authorizedBackendVerify",
  "authorizedBackendRealtime",
  "blockedNextImage",
  "blockedNextDevelopment",
  "blockedUnknownLocalApi",
  "blockedServerAction",
  "blockedUnauthorizedLocalMutation",
  "blockedOtherOriginPort",
  "blockedWebSocket",
  "externalRealRequests",
] as const;

export type IsolationCategory = (typeof ISOLATION_CATEGORIES)[number];
export type IsolationProducer = (typeof ISOLATION_PRODUCERS)[number];
export type IsolationCounter = {
  observed: number;
  blocked: number;
  allowed: number;
  realNetworkReached: number;
};
export type IsolationEvidence = {
  version: typeof ISOLATION_REPORT_VERSION;
  complete: boolean;
  externalRealRequests: number;
  categories: Record<IsolationCategory, IsolationCounter>;
};
type IsolationShard = IsolationEvidence & { producer: IsolationProducer };

export type AttemptArtifacts = {
  runId: string;
  storageStatePath: string;
};

type ArtifactKind = "storage" | "isolation-shard";

function sanitizedArtifactError(): Error {
  return new Error("Falha na validação segura de artefato E2E");
}

function isMissing(error: unknown): boolean {
  return (error as NodeJS.ErrnoException).code === "ENOENT";
}

function validateRunId(runId: string): string {
  if (!/^[a-f0-9]{32}$/i.test(runId)) throw sanitizedArtifactError();
  return runId.toLowerCase();
}

function validateInstanceNonce(instanceNonce: string): string {
  if (!/^[a-f0-9]{32}$/i.test(instanceNonce)) throw sanitizedArtifactError();
  return instanceNonce.toLowerCase();
}

function assertSafeRoot(): string {
  const root = path.resolve(E2E_ARTIFACTS_ROOT);
  const appRoot = path.resolve(APP_ROOT);
  if (root === path.parse(root).root || root === appRoot) throw sanitizedArtifactError();

  const volumeRoot = path.parse(appRoot).root;
  let current = volumeRoot;
  for (const segment of path.relative(volumeRoot, appRoot).split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    try {
      const stat = fs.lstatSync(current);
      if (stat.isSymbolicLink() || !stat.isDirectory()) throw sanitizedArtifactError();
    } catch {
      throw sanitizedArtifactError();
    }
  }

  const relative = path.relative(appRoot, root);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw sanitizedArtifactError();
  }
  current = appRoot;
  for (const segment of relative.split(path.sep)) {
    current = path.join(current, segment);
    try {
      const stat = fs.lstatSync(current);
      if (stat.isSymbolicLink() || !stat.isDirectory()) throw sanitizedArtifactError();
    } catch (error) {
      if (!isMissing(error)) throw sanitizedArtifactError();
      fs.mkdirSync(current, { mode: 0o700 });
    }
  }
  const rootStat = fs.lstatSync(root);
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) throw sanitizedArtifactError();
  return fs.realpathSync(root);
}

function parseArtifactName(filePath: string): {
  kind: ArtifactKind;
  runId: string;
  producer?: IsolationProducer;
} {
  const name = path.basename(filePath);
  const storage = /^storage-state-([a-f0-9]{32})\.json$/.exec(name);
  if (storage?.[1]) return { kind: "storage", runId: storage[1].toLowerCase() };
  const shard =
    /^isolation-shard-([a-f0-9]{32})-(global-setup|test-worker)-([1-9]\d*)-([a-f0-9]{32})\.json$/.exec(
      name
    );
  if (shard?.[1] && shard[2] && shard[4]) {
    return {
      kind: "isolation-shard",
      runId: shard[1].toLowerCase(),
      producer: shard[2] as IsolationProducer,
    };
  }
  throw sanitizedArtifactError();
}

export function assertControlledArtifactPath(filePath: string, kind?: ArtifactKind): void {
  if (!filePath || filePath === path.parse(path.resolve(filePath)).root) {
    throw sanitizedArtifactError();
  }
  const resolved = path.resolve(filePath);
  const root = path.resolve(E2E_ARTIFACTS_ROOT);
  const relative = path.relative(root, resolved);
  if (
    !relative ||
    relative.startsWith("..") ||
    path.isAbsolute(relative) ||
    path.dirname(relative) !== "."
  ) {
    throw sanitizedArtifactError();
  }
  const parsed = parseArtifactName(resolved);
  if (kind && parsed.kind !== kind) throw sanitizedArtifactError();

  const realRoot = assertSafeRoot();
  if (fs.realpathSync(path.dirname(resolved)) !== realRoot) throw sanitizedArtifactError();
  try {
    const stat = fs.lstatSync(resolved);
    if (stat.isSymbolicLink() || !stat.isFile()) throw sanitizedArtifactError();
  } catch (error) {
    if (!isMissing(error)) throw sanitizedArtifactError();
  }
}

export function isolationShardPath(
  runId: string,
  producer: IsolationProducer,
  pid = process.pid,
  instanceNonce = PROCESS_INSTANCE_NONCE
): string {
  const normalizedRunId = validateRunId(runId);
  const normalizedNonce = validateInstanceNonce(instanceNonce);
  if (!ISOLATION_PRODUCERS.includes(producer) || !Number.isSafeInteger(pid) || pid <= 0) {
    throw sanitizedArtifactError();
  }
  const filePath = path.join(
    E2E_ARTIFACTS_ROOT,
    `isolation-shard-${normalizedRunId}-${producer}-${pid}-${normalizedNonce}.json`
  );
  assertControlledArtifactPath(filePath, "isolation-shard");
  return filePath;
}

function currentShardPaths(runId: string): string[] {
  const normalizedRunId = validateRunId(runId);
  const prefix = `isolation-shard-${normalizedRunId}-`;
  const root = assertSafeRoot();
  const paths: string[] = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.name.toLowerCase().startsWith(prefix)) continue;
    const filePath = path.join(root, entry.name);
    assertControlledArtifactPath(filePath, "isolation-shard");
    if (!entry.isFile() || entry.isSymbolicLink()) throw sanitizedArtifactError();
    paths.push(filePath);
  }
  return paths.sort();
}

export function prepareAttemptArtifacts(runId: string): AttemptArtifacts {
  const normalizedRunId = validateRunId(runId);
  assertSafeRoot();
  const storageStatePath = path.join(
    E2E_ARTIFACTS_ROOT,
    `storage-state-${normalizedRunId}.json`
  );
  assertControlledArtifactPath(storageStatePath, "storage");
  if (fs.existsSync(storageStatePath) || currentShardPaths(normalizedRunId).length > 0) {
    throw sanitizedArtifactError();
  }
  return { runId: normalizedRunId, storageStatePath };
}

export function removeControlledArtifact(filePath: string, kind?: ArtifactKind): void {
  assertControlledArtifactPath(filePath, kind);
  try {
    fs.unlinkSync(filePath);
  } catch (error) {
    if (!isMissing(error)) throw sanitizedArtifactError();
  }
  try {
    fs.lstatSync(filePath);
    throw sanitizedArtifactError();
  } catch (error) {
    if (!isMissing(error)) throw sanitizedArtifactError();
  }
}

export function controlledArtifactIsAbsent(filePath: string, kind?: ArtifactKind): boolean {
  assertControlledArtifactPath(filePath, kind);
  try {
    fs.lstatSync(filePath);
    return false;
  } catch (error) {
    if (isMissing(error)) return true;
    throw sanitizedArtifactError();
  }
}

export function attemptArtifactsAreAbsent(artifacts: AttemptArtifacts): boolean {
  const runId = validateRunId(artifacts.runId);
  const parsedStorage = parseArtifactName(artifacts.storageStatePath);
  if (parsedStorage.kind !== "storage" || parsedStorage.runId !== runId) {
    throw sanitizedArtifactError();
  }
  return (
    controlledArtifactIsAbsent(artifacts.storageStatePath, "storage") &&
    currentShardPaths(runId).length === 0
  );
}

export function initializeSafeStorageState(filePath: string, expectedRunId: string): void {
  assertControlledArtifactPath(filePath, "storage");
  const parsed = parseArtifactName(filePath);
  if (parsed.runId !== validateRunId(expectedRunId)) throw sanitizedArtifactError();
  let fd: number | undefined;
  try {
    fd = fs.openSync(filePath, "wx", 0o600);
    fs.writeFileSync(fd, '{"cookies":[],"origins":[]}\n', "utf8");
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = undefined;
  } catch {
    if (fd !== undefined) fs.closeSync(fd);
    throw sanitizedArtifactError();
  }
}

export function createIsolationEvidence(): IsolationEvidence {
  return {
    version: ISOLATION_REPORT_VERSION,
    complete: false,
    externalRealRequests: 0,
    categories: Object.fromEntries(
      ISOLATION_CATEGORIES.map((category) => [
        category,
        { observed: 0, blocked: 0, allowed: 0, realNetworkReached: 0 },
      ])
    ) as Record<IsolationCategory, IsolationCounter>,
  };
}

export function recordIsolationDecision(
  evidence: IsolationEvidence,
  category: IsolationCategory,
  outcome: "blocked" | "allowed",
  realNetworkReached = false
): void {
  const counter = evidence.categories[category];
  counter.observed += 1;
  counter[outcome] += 1;
  if (realNetworkReached) counter.realNetworkReached += 1;
}

function isCounter(value: unknown): value is IsolationCounter {
  if (!value || typeof value !== "object") return false;
  const counter = value as Record<string, unknown>;
  return (
    Object.keys(counter).sort().join(",") ===
      ["allowed", "blocked", "observed", "realNetworkReached"].sort().join(",") &&
    ["observed", "blocked", "allowed", "realNetworkReached"].every(
      (key) => Number.isSafeInteger(counter[key]) && Number(counter[key]) >= 0
    )
  );
}

export function validateIsolationEvidence(value: unknown): IsolationEvidence {
  if (!value || typeof value !== "object") throw new Error("Relatório de isolamento inválido");
  const report = value as Record<string, unknown>;
  if (
    Object.keys(report).sort().join(",") !==
      ["categories", "complete", "externalRealRequests", "version"].sort().join(",") ||
    report.version !== ISOLATION_REPORT_VERSION ||
    report.complete !== true ||
    report.externalRealRequests !== 0 ||
    !report.categories ||
    typeof report.categories !== "object"
  ) {
    throw new Error("Relatório de isolamento inválido");
  }
  const categories = report.categories as Record<string, unknown>;
  if (
    Object.keys(categories).sort().join(",") !== [...ISOLATION_CATEGORIES].sort().join(",") ||
    !ISOLATION_CATEGORIES.every((category) => isCounter(categories[category]))
  ) {
    throw new Error("Relatório de isolamento inválido");
  }

  for (const category of ISOLATION_CATEGORIES) {
    const counter = categories[category] as IsolationCounter;
    if (
      counter.observed !== counter.blocked + counter.allowed ||
      counter.realNetworkReached > counter.allowed
    ) {
      throw new Error("Relatório de isolamento inconsistente");
    }
  }
  for (const category of [
    "authorizedBackendLogin",
    "authorizedBackendVerify",
    "authorizedBackendRealtime",
  ] as const) {
    const counter = categories[category] as IsolationCounter;
    if (
      counter.blocked !== 0 ||
      counter.allowed !== counter.observed ||
      counter.realNetworkReached !== counter.allowed
    ) {
      throw new Error("Relatório de isolamento inconsistente");
    }
  }
  for (const category of [
    "blockedNextImage",
    "blockedNextDevelopment",
    "blockedUnknownLocalApi",
    "blockedServerAction",
    "blockedUnauthorizedLocalMutation",
    "blockedOtherOriginPort",
    "blockedWebSocket",
    "externalRealRequests",
  ] as const) {
    const counter = categories[category] as IsolationCounter;
    if (
      counter.blocked !== counter.observed ||
      counter.allowed !== 0 ||
      counter.realNetworkReached !== 0
    ) {
      throw new Error("Relatório de isolamento não aprovado");
    }
  }
  const external = categories.externalRealRequests as IsolationCounter;
  if (
    external.observed !== 0 ||
    external.blocked !== 0 ||
    external.allowed !== 0 ||
    external.realNetworkReached !== report.externalRealRequests
  ) {
    throw new Error("Relatório de isolamento não aprovado");
  }
  return value as IsolationEvidence;
}

function validateIsolationShard(value: unknown, expectedProducer: IsolationProducer): IsolationShard {
  if (!value || typeof value !== "object") throw new Error("Shard de isolamento inválido");
  const shard = value as Record<string, unknown>;
  if (
    Object.keys(shard).sort().join(",") !==
      ["categories", "complete", "externalRealRequests", "producer", "version"]
        .sort()
        .join(",") ||
    shard.producer !== expectedProducer
  ) {
    throw new Error("Shard de isolamento inválido");
  }
  const report = {
    version: shard.version,
    complete: shard.complete,
    externalRealRequests: shard.externalRealRequests,
    categories: shard.categories,
  };
  return {
    ...validateIsolationEvidence(report),
    producer: expectedProducer,
  };
}

export function writeIsolationShard(
  runId: string,
  producer: IsolationProducer,
  evidence: IsolationEvidence,
  pid = process.pid,
  instanceNonce = PROCESS_INSTANCE_NONCE
): string {
  const filePath = isolationShardPath(runId, producer, pid, instanceNonce);
  const payload = `${JSON.stringify({ ...evidence, producer })}\n`;
  let fd: number | undefined;
  try {
    try {
      fd = fs.openSync(filePath, "r+");
      fs.ftruncateSync(fd, 0);
    } catch (error) {
      if (!isMissing(error)) throw error;
      fd = fs.openSync(filePath, "wx", 0o600);
    }
    fs.writeFileSync(fd, payload, "utf8");
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = undefined;
    return filePath;
  } catch {
    if (fd !== undefined) fs.closeSync(fd);
    throw sanitizedArtifactError();
  }
}

function mergeIsolationEvidence(target: IsolationEvidence, source: IsolationEvidence): void {
  target.externalRealRequests += source.externalRealRequests;
  for (const category of ISOLATION_CATEGORIES) {
    const targetCounter = target.categories[category];
    const sourceCounter = source.categories[category];
    targetCounter.observed += sourceCounter.observed;
    targetCounter.blocked += sourceCounter.blocked;
    targetCounter.allowed += sourceCounter.allowed;
    targetCounter.realNetworkReached += sourceCounter.realNetworkReached;
  }
}

export function consumeAggregatedIsolationEvidence(runId: string): IsolationEvidence {
  const shardPaths = currentShardPaths(runId);
  let sawGlobalSetup = false;
  let sawTestWorker = false;
  const aggregate = createIsolationEvidence();
  aggregate.complete = true;
  try {
    for (const shardPath of shardPaths) {
      const parsed = parseArtifactName(shardPath);
      if (!parsed.producer) throw sanitizedArtifactError();
      const shard = validateIsolationShard(
        JSON.parse(fs.readFileSync(shardPath, "utf8")) as unknown,
        parsed.producer
      );
      sawGlobalSetup ||= shard.producer === "global-setup";
      sawTestWorker ||= shard.producer === "test-worker";
      mergeIsolationEvidence(aggregate, shard);
    }
    if (!sawGlobalSetup || !sawTestWorker) {
      throw new Error("Evidência de isolamento incompleta");
    }
    return validateIsolationEvidence(aggregate);
  } finally {
    for (const shardPath of shardPaths) {
      removeControlledArtifact(shardPath, "isolation-shard");
    }
  }
}
