import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  E2E_ARTIFACTS_ROOT,
  ISOLATION_CATEGORIES,
  assertControlledArtifactPath,
  attemptArtifactsAreAbsent,
  consumeAggregatedIsolationEvidence,
  controlledArtifactIsAbsent,
  createIsolationEvidence,
  initializeSafeStorageState,
  prepareAttemptArtifacts,
  recordIsolationDecision,
  removeControlledArtifact,
  validateIsolationEvidence,
  writeIsolationShard,
} from "./inbox-e2e-artifacts";

const createdPaths: string[] = [];
let sequence = 0;

function artifacts() {
  sequence += 1;
  const value = prepareAttemptArtifacts(sequence.toString(16).padStart(32, "0"));
  createdPaths.push(value.storageStatePath);
  return value;
}

function trackShard(
  runId: string,
  producer: "global-setup" | "test-worker",
  evidence: ReturnType<typeof createIsolationEvidence>,
  pid: number,
  instanceNonce?: string
) {
  const shardPath = writeIsolationShard(runId, producer, evidence, pid, instanceNonce);
  createdPaths.push(shardPath);
  return shardPath;
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const filePath of createdPaths.splice(0)) {
    try {
      fs.rmSync(filePath, { recursive: true, force: true });
    } catch {
      // Aserções de falha podem deixar um caminho deliberadamente inválido.
    }
  }
});

describe("safe inbox E2E artifacts", () => {
  it("removes a current-attempt storage state and confirms integral absence", () => {
    const attempt = artifacts();
    initializeSafeStorageState(attempt.storageStatePath, attempt.runId);
    removeControlledArtifact(attempt.storageStatePath, "storage");
    expect(controlledArtifactIsAbsent(attempt.storageStatePath, "storage")).toBe(true);
    expect(attemptArtifactsAreAbsent(attempt)).toBe(true);
  });

  it("accepts an already absent approved storage state", () => {
    const { storageStatePath } = artifacts();
    expect(() => removeControlledArtifact(storageStatePath, "storage")).not.toThrow();
    expect(controlledArtifactIsAbsent(storageStatePath, "storage")).toBe(true);
  });

  it("rejects a controlled storage path belonging to another attempt", () => {
    const attempt = artifacts();
    expect(() =>
      initializeSafeStorageState(attempt.storageStatePath, "f".repeat(32))
    ).toThrow(/artefato E2E/);
    expect(fs.existsSync(attempt.storageStatePath)).toBe(false);
  });

  it("rejects outside, root, broad, escaped and nested storage paths before write", () => {
    const outside = path.join(
      path.dirname(E2E_ARTIFACTS_ROOT),
      `storage-state-${"a".repeat(32)}.json`
    );
    const expectedRunId = "e".repeat(32);
    const candidates = [
      outside,
      E2E_ARTIFACTS_ROOT,
      path.parse(E2E_ARTIFACTS_ROOT).root,
      path.join(E2E_ARTIFACTS_ROOT, "..", `storage-state-${"b".repeat(32)}.json`),
      path.join(E2E_ARTIFACTS_ROOT, "nested", `storage-state-${"c".repeat(32)}.json`),
    ];
    const existedBefore = new Map(
      candidates.map((candidate) => [candidate, fs.existsSync(candidate)])
    );
    for (const candidate of candidates) {
      expect(() => initializeSafeStorageState(candidate, expectedRunId)).toThrow(/artefato E2E/);
      expect(fs.existsSync(candidate)).toBe(existedBefore.get(candidate));
    }
  });

  it("rejects a directory and symbolic-link storage path before write", () => {
    const firstAttempt = artifacts();
    const first = firstAttempt.storageStatePath;
    fs.mkdirSync(first);
    expect(() => initializeSafeStorageState(first, firstAttempt.runId)).toThrow(/artefato E2E/);

    const secondAttempt = artifacts();
    const second = secondAttempt.storageStatePath;
    const target = path.join(E2E_ARTIFACTS_ROOT, `target-${sequence}`);
    createdPaths.push(target);
    fs.mkdirSync(target);
    fs.symlinkSync(target, second, "junction");
    expect(() => initializeSafeStorageState(second, secondAttempt.runId)).toThrow(/artefato E2E/);
  });

  it("fails when removal cannot be performed or absence cannot be confirmed", () => {
    const { storageStatePath, runId } = artifacts();
    initializeSafeStorageState(storageStatePath, runId);
    vi.spyOn(fs, "unlinkSync").mockImplementationOnce(() => {
      const error = new Error("private path") as NodeJS.ErrnoException;
      error.code = "EACCES";
      throw error;
    });
    expect(() => removeControlledArtifact(storageStatePath, "storage")).toThrow(/artefato E2E/);
    expect(fs.existsSync(storageStatePath)).toBe(true);
  });

  it("aggregates global setup, workers and retry shards without lost categories", () => {
    const attempt = artifacts();
    const { runId } = attempt;
    const global = createIsolationEvidence();
    global.complete = true;
    trackShard(runId, "global-setup", global, 1001);

    const firstWorker = createIsolationEvidence();
    recordIsolationDecision(firstWorker, "authorizedBackendLogin", "allowed", true);
    recordIsolationDecision(firstWorker, "blockedNextImage", "blocked");
    firstWorker.complete = true;
    trackShard(runId, "test-worker", firstWorker, 1002);

    const retryWorker = createIsolationEvidence();
    recordIsolationDecision(retryWorker, "authorizedBackendVerify", "allowed", true);
    recordIsolationDecision(retryWorker, "blockedWebSocket", "blocked");
    retryWorker.complete = true;
    trackShard(runId, "test-worker", retryWorker, 1003);

    const aggregate = consumeAggregatedIsolationEvidence(runId);
    expect(aggregate.categories.authorizedBackendLogin.observed).toBe(1);
    expect(aggregate.categories.authorizedBackendVerify.observed).toBe(1);
    expect(aggregate.categories.blockedNextImage.blocked).toBe(1);
    expect(aggregate.categories.blockedWebSocket.blocked).toBe(1);
    expect(aggregate.categories.authorizedBackendRealtime.observed).toBe(0);
    expect(attemptArtifactsAreAbsent(attempt)).toBe(true);
  });

  it("updates only its own process shard without overwriting prior decisions", () => {
    const { runId } = artifacts();
    const global = createIsolationEvidence();
    global.complete = true;
    trackShard(runId, "global-setup", global, 1101);

    const worker = createIsolationEvidence();
    const workerNonce = "2".repeat(32);
    recordIsolationDecision(worker, "blockedUnknownLocalApi", "blocked");
    trackShard(runId, "test-worker", worker, 1102, workerNonce);
    recordIsolationDecision(worker, "blockedServerAction", "blocked");
    worker.complete = true;
    trackShard(runId, "test-worker", worker, 1102, workerNonce);

    const aggregate = consumeAggregatedIsolationEvidence(runId);
    expect(aggregate.categories.blockedUnknownLocalApi.blocked).toBe(1);
    expect(aggregate.categories.blockedServerAction.blocked).toBe(1);
  });

  it("keeps distinct sequential process shards when the operating system reuses a PID", () => {
    const { runId } = artifacts();
    const global = createIsolationEvidence();
    global.complete = true;
    trackShard(runId, "global-setup", global, 1401, "1".repeat(32));

    const firstProcess = createIsolationEvidence();
    recordIsolationDecision(firstProcess, "blockedNextDevelopment", "blocked");
    firstProcess.complete = true;
    const firstPath = trackShard(
      runId,
      "test-worker",
      firstProcess,
      1402,
      "a".repeat(32)
    );

    const secondProcess = createIsolationEvidence();
    recordIsolationDecision(secondProcess, "blockedOtherOriginPort", "blocked");
    secondProcess.complete = true;
    const secondPath = trackShard(
      runId,
      "test-worker",
      secondProcess,
      1402,
      "b".repeat(32)
    );

    expect(firstPath).not.toBe(secondPath);
    expect(fs.existsSync(firstPath)).toBe(true);
    expect(fs.existsSync(secondPath)).toBe(true);
    const aggregate = consumeAggregatedIsolationEvidence(runId);
    expect(aggregate.categories.blockedNextDevelopment.blocked).toBe(1);
    expect(aggregate.categories.blockedOtherOriginPort.blocked).toBe(1);
  });

  it("requires complete global-setup and test-worker evidence and removes controlled shards", () => {
    const attempt = artifacts();
    const { runId } = attempt;
    const global = createIsolationEvidence();
    global.complete = true;
    trackShard(runId, "global-setup", global, 1201);
    expect(() => consumeAggregatedIsolationEvidence(runId)).toThrow(/incompleta/);
    expect(attemptArtifactsAreAbsent(attempt)).toBe(true);
  });

  it("rejects inconsistent or passthrough evidence for protected categories", () => {
    const inconsistent = createIsolationEvidence();
    inconsistent.complete = true;
    inconsistent.categories.blockedNextImage.observed = 1;
    expect(() => validateIsolationEvidence(inconsistent)).toThrow(/inconsistente/);

    const passthrough = createIsolationEvidence();
    passthrough.complete = true;
    recordIsolationDecision(passthrough, "externalRealRequests", "allowed", true);
    expect(() => validateIsolationEvidence(passthrough)).toThrow(/não aprovado/);
  });

  it("keeps all categories explicit when every producer observed zero requests", () => {
    const { runId } = artifacts();
    const global = createIsolationEvidence();
    global.complete = true;
    trackShard(runId, "global-setup", global, 1301);
    const worker = createIsolationEvidence();
    worker.complete = true;
    trackShard(runId, "test-worker", worker, 1302);
    const aggregate = consumeAggregatedIsolationEvidence(runId);
    expect(Object.keys(aggregate.categories).sort()).toEqual([...ISOLATION_CATEGORIES].sort());
    expect(Object.values(aggregate.categories).every((counter) => counter.observed === 0)).toBe(
      true
    );
  });

  it("rejects unapproved shard filenames", () => {
    const filePath = path.join(
      E2E_ARTIFACTS_ROOT,
      `isolation-shard-${"d".repeat(32)}-test-worker-not-a-pid.json`
    );
    expect(() => assertControlledArtifactPath(filePath, "isolation-shard")).toThrow(
      /artefato E2E/
    );
    const { runId } = artifacts();
    const evidence = createIsolationEvidence();
    expect(() =>
      writeIsolationShard(runId, "test-worker", evidence, 1501, "not-a-valid-nonce")
    ).toThrow(/artefato E2E/);
  });
});
