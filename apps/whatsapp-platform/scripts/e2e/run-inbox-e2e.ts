import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "../../src/generated/prisma-whatsapp";
import {
  APP_ROOT,
  RECEIPT_PATH,
  acquireFixtureLock,
  targetFingerprint,
} from "./inbox-e2e-fixture";
import {
  attemptArtifactsAreAbsent,
  consumeAggregatedIsolationEvidence,
  prepareAttemptArtifacts,
  removeControlledArtifact,
  type AttemptArtifacts,
  type IsolationEvidence,
} from "./inbox-e2e-artifacts";
import {
  resolveInboxE2EEnvironment,
  verifyTargetFingerprint as verifyFingerprint,
} from "./inbox-e2e-environment";
import { cleanupInboxFixture, type CleanupClient } from "./cleanup-inbox-e2e";
import { provisionInboxFixture, type ProvisionClient } from "./provision-inbox-e2e";

export const SAFE_BASE_URL = "http://127.0.0.1:3099";

export function waitForExit(child: ChildProcess): Promise<number> {
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      resolve(code ?? (signal ? 1 : 0));
    });
  });
}

export async function stopProcessTree(child: ChildProcess | null): Promise<void> {
  if (!child?.pid || child.exitCode !== null) return;
  if (process.platform === "win32") {
    const killer = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    await waitForExit(killer).catch(() => undefined);
    return;
  }
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    child.kill("SIGTERM");
  }
}

export type ManagedProcess = {
  wait(): Promise<number>;
  stop(): Promise<void>;
};

export type RunnerIdentity = { runId: string; email: string; password: string };

export type SignalSource = {
  once(signal: "SIGINT" | "SIGTERM", listener: (signal: NodeJS.Signals) => void): unknown;
  removeListener(signal: "SIGINT" | "SIGTERM", listener: (signal: NodeJS.Signals) => void): unknown;
};

export type InboxLifecycleDependencies = {
  verifyTargetFingerprint(stage: "provision" | "execution" | "cleanup"): Promise<void> | void;
  provision(): Promise<RunnerIdentity>;
  prepareArtifacts(identity: RunnerIdentity): Promise<void> | void;
  startServer(): Promise<ManagedProcess>;
  waitForServer(server: ManagedProcess): Promise<void>;
  startPlaywright(identity: RunnerIdentity): Promise<ManagedProcess>;
  cleanupArtifacts(): Promise<void>;
  artifactsAbsent(): boolean;
  cleanup(): Promise<void>;
  receiptExists(): boolean;
  releaseLock(): void;
  reportCompletion(): void;
  signals?: SignalSource;
};

type FixtureMarkerState =
  | "attempt-lock-held"
  | "receipt-and-lock-held"
  | "cleanup-complete"
  | "released";

export class InboxMarkerPreservationError extends Error {
  constructor(options?: ErrorOptions) {
    super("Ciclo abortado; recibo e lock preservados para verificação segura", options);
    this.name = "InboxMarkerPreservationError";
  }
}

export class InboxShutdownError extends AggregateError {
  constructor(resources: string[]) {
    super(
      resources.map((resource) => new Error(`Falha sanitizada ao parar ${resource}`)),
      `Falha sanitizada no shutdown: ${resources.join(", ")}`
    );
    this.name = "InboxShutdownError";
  }
}

export async function runInboxLifecycle(deps: InboxLifecycleDependencies): Promise<number> {
  const signals = deps.signals ?? process;
  let server: ManagedProcess | null = null;
  let playwright: ManagedProcess | null = null;
  let serverStopped = false;
  let playwrightStopped = false;
  let markerState: FixtureMarkerState = "attempt-lock-held";
  let interruptedSignal: NodeJS.Signals | null = null;
  let stopPromise: Promise<void> = Promise.resolve();
  const verifiedTargetStages = new Set<"provision" | "execution" | "cleanup">();

  const verifyTarget = async (stage: "provision" | "execution" | "cleanup") => {
    await deps.verifyTargetFingerprint(stage);
    verifiedTargetStages.add(stage);
  };

  const stopProcesses = async () => {
    const stops: Array<{ resource: string; promise: Promise<void> }> = [];
    if (playwright && !playwrightStopped) {
      playwrightStopped = true;
      stops.push({
        resource: "Playwright",
        promise: Promise.resolve().then(() => playwright!.stop()),
      });
    }
    if (server && !serverStopped) {
      serverStopped = true;
      stops.push({
        resource: "Next",
        promise: Promise.resolve().then(() => server!.stop()),
      });
    }
    const results = await Promise.allSettled(stops.map(({ promise }) => promise));
    const failedResources = results.flatMap((result, index) =>
      result.status === "rejected" ? [stops[index]!.resource] : []
    );
    if (failedResources.length > 0) {
      throw new InboxShutdownError(failedResources);
    }
  };

  const onSignal = (signal: NodeJS.Signals) => {
    interruptedSignal = signal;
    stopPromise = stopPromise.then(stopProcesses);
  };
  signals.once("SIGINT", onSignal);
  signals.once("SIGTERM", onSignal);

  try {
    let testExitCode = 1;
    let executionError: unknown;
    let shutdownError: unknown;
    let artifactError: unknown;
    let artifactPreparationFailed = false;
    try {
      await verifyTarget("provision");
      const identity = await deps.provision();
      markerState = "receipt-and-lock-held";
      try {
        await deps.prepareArtifacts(identity);
      } catch (error) {
        artifactPreparationFailed = true;
        throw error;
      }
      await verifyTarget("execution");
      if (!interruptedSignal) {
        server = await deps.startServer();
        if (!interruptedSignal) await deps.waitForServer(server);
      }
      if (!interruptedSignal) {
        playwright = await deps.startPlaywright(identity);
        if (!interruptedSignal) testExitCode = await playwright.wait();
      }
    } catch (error) {
      if (markerState === "attempt-lock-held" && deps.receiptExists()) {
        markerState = "receipt-and-lock-held";
      }
      executionError = error;
    } finally {
      try {
        await stopPromise;
        await stopProcesses();
      } catch (error) {
        shutdownError = error;
      }
    }

    if (shutdownError) {
      let surfacedInfrastructureError: unknown = shutdownError;
      if (markerState === "receipt-and-lock-held") {
        surfacedInfrastructureError = new InboxMarkerPreservationError({
          cause: shutdownError,
        });
      } else {
        deps.releaseLock();
        markerState = "released";
      }
      if (executionError) {
        throw new AggregateError(
          [executionError, surfacedInfrastructureError],
          "Falha de execução e infraestrutura no Inbox E2E"
        );
      }
      throw surfacedInfrastructureError;
    }

    if (artifactPreparationFailed) {
      throw new InboxMarkerPreservationError({ cause: executionError });
    }

    try {
      await deps.cleanupArtifacts();
      if (!deps.artifactsAbsent()) {
        throw new Error("Artefatos E2E ainda presentes");
      }
    } catch (error) {
      artifactError = error;
    }
    if (artifactError) {
      if (markerState === "receipt-and-lock-held") {
        throw new InboxMarkerPreservationError({ cause: artifactError });
      }
      deps.releaseLock();
      markerState = "released";
      throw artifactError;
    }
    if (markerState === "receipt-and-lock-held") {
      try {
        await verifyTarget("cleanup");
        await deps.cleanup();
        if (deps.receiptExists()) {
          throw new Error("Cleanup incompleto: recibo ainda presente");
        }
        markerState = "cleanup-complete";
      } catch (error) {
        throw new InboxMarkerPreservationError({ cause: error });
      }
    }
    if (markerState === "attempt-lock-held" || markerState === "cleanup-complete") {
      deps.releaseLock();
      markerState = "released";
    }
    if (verifiedTargetStages.size === 3) deps.reportCompletion();
    if (executionError && !interruptedSignal) throw executionError;
    return interruptedSignal === "SIGTERM" ? 143 : interruptedSignal ? 130 : testExitCode;
  } finally {
    signals.removeListener("SIGINT", onSignal);
    signals.removeListener("SIGTERM", onSignal);
  }
}

function managedChild(child: ChildProcess): ManagedProcess {
  const exited = waitForExit(child);
  let stopped = false;
  return {
    wait: () => exited,
    async stop() {
      if (stopped) return;
      stopped = true;
      await stopProcessTree(child);
      await exited.catch(() => undefined);
    },
  };
}

export function resolveInstalledCli(moduleId: string): string {
  return createRequire(import.meta.url).resolve(moduleId);
}

export async function waitForHttpReadiness(
  server: ManagedProcess,
  url = `${SAFE_BASE_URL}/login`,
  timeoutMs = 120_000
): Promise<void> {
  const startedAt = Date.now();
  let serverExitCode: number | undefined;
  let serverError: unknown;
  void server.wait().then(
    (code) => {
      serverExitCode = code;
    },
    (error: unknown) => {
      serverError = error;
    }
  );
  while (Date.now() - startedAt < timeoutMs) {
    if (serverError) throw serverError;
    if (serverExitCode !== undefined) {
      throw new Error(`Next server exited before readiness (${serverExitCode})`);
    }
    try {
      const response = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(2_000),
      });
      if (response.status < 500) return;
    } catch {
      // O processo ainda pode estar compilando ou abrindo a porta.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Next server readiness timeout");
}

export async function runInboxE2E(): Promise<number> {
  const resolvedEnvironment = resolveInboxE2EEnvironment();
  const { datasourceUrl, env, targetFingerprint: expectedTargetFingerprint } = resolvedEnvironment;
  const lock = acquireFixtureLock();
  let artifacts: AttemptArtifacts | undefined;
  let playwrightWasStarted = false;
  let isolationEvidence: IsolationEvidence | undefined;
  return runInboxLifecycle({
      verifyTargetFingerprint(stage) {
        const stageFingerprint =
          stage === "cleanup"
            ? resolveInboxE2EEnvironment().targetFingerprint
            : targetFingerprint(datasourceUrl);
        const currentFinalFingerprint = resolveInboxE2EEnvironment().targetFingerprint;
        verifyFingerprint(expectedTargetFingerprint, stageFingerprint);
        verifyFingerprint(expectedTargetFingerprint, currentFinalFingerprint);
      },
      async provision() {
        const client = new PrismaClient({ datasources: { db: { url: datasourceUrl } } });
        try {
          return await provisionInboxFixture({
            client: client as unknown as ProvisionClient,
            datasourceUrl,
            heldLock: lock,
          });
        } finally {
          await client.$disconnect();
        }
      },
      prepareArtifacts(identity) {
        artifacts = prepareAttemptArtifacts(identity.runId);
      },
      async startServer() {
        const nextCli = resolveInstalledCli("next/dist/bin/next");
        return managedChild(
          spawn(
            process.execPath,
            [nextCli, "dev", "-H", "127.0.0.1", "-p", "3099"],
            {
              cwd: APP_ROOT,
              stdio: "inherit",
              detached: process.platform !== "win32",
              windowsHide: true,
              env: {
                ...env,
                WHATSAPP_SKIP_CLOUD_CREDENTIAL_VALIDATE: "1",
              },
            }
          )
        );
      },
      waitForServer: (server) => waitForHttpReadiness(server),
      async startPlaywright(identity) {
        if (!artifacts) throw new Error("Artefatos da tentativa não preparados");
        const playwrightCli = resolveInstalledCli("@playwright/test/cli");
        const child = managedChild(
          spawn(
            process.execPath,
            [playwrightCli, "test", "tests/e2e/inbox.spec.ts"],
            {
              cwd: APP_ROOT,
              stdio: "inherit",
              detached: process.platform !== "win32",
              windowsHide: true,
              env: {
                ...env,
                E2E_WHATSAPP_BASE_URL: SAFE_BASE_URL,
                E2E_WHATSAPP_ADMIN_EMAIL: identity.email,
                E2E_WHATSAPP_ADMIN_PASSWORD: identity.password,
                E2E_AUTH_STORAGE_STATE_PATH: artifacts.storageStatePath,
                INBOX_E2E_ATTEMPT_ID: artifacts.runId,
                INBOX_E2E_SAFE_MODE: "1",
                PLAYWRIGHT_SKIP_WEBSERVER: "1",
              },
            }
          )
        );
        playwrightWasStarted = true;
        return child;
      },
      async cleanupArtifacts() {
        if (!artifacts) return;
        removeControlledArtifact(artifacts.storageStatePath, "storage");
        if (playwrightWasStarted) {
          try {
            isolationEvidence = consumeAggregatedIsolationEvidence(artifacts.runId);
          } catch {
            throw new Error("Relatório de isolamento não aprovado");
          }
        }
      },
      artifactsAbsent() {
        if (!artifacts) return true;
        return attemptArtifactsAreAbsent(artifacts);
      },
      async cleanup() {
        const client = new PrismaClient({ datasources: { db: { url: datasourceUrl } } });
        try {
          await cleanupInboxFixture({
            client: client as unknown as CleanupClient,
            datasourceUrl,
            heldLock: lock,
          });
        } finally {
          await client.$disconnect();
        }
      },
      receiptExists: () => fs.existsSync(RECEIPT_PATH),
      releaseLock: () => lock.release(),
      reportCompletion() {
        console.info("[inbox-e2e] " + JSON.stringify({ targetFingerprintVerified: true }));
        if (isolationEvidence) {
          console.info("[inbox-e2e:isolation] " + JSON.stringify(isolationEvidence));
        }
      },
    });
}

const isDirectExecution =
  Boolean(process.argv[1]) && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isDirectExecution) {
  runInboxE2E()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error: unknown) => {
      console.error(
        error instanceof InboxMarkerPreservationError
          ? error.message
          : "Falha no ciclo Inbox E2E; consulte os logs sanitizados"
      );
      process.exitCode = 1;
    });
}
