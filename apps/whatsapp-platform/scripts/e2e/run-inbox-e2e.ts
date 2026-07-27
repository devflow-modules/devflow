import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { PrismaClient } from "../../src/generated/prisma-whatsapp";
import {
  APP_ROOT,
  RECEIPT_PATH,
  acquireFixtureLock,
  resolveDatasourceUrl,
} from "./inbox-e2e-fixture";
import { cleanupInboxFixture, type CleanupClient } from "./cleanup-inbox-e2e";
import { provisionInboxFixture, type ProvisionClient } from "./provision-inbox-e2e";

export const SAFE_BASE_URL = "http://127.0.0.1:3099";

function loadLocalEnvironment(): void {
  config({ path: path.resolve(APP_ROOT, "../../.env.local") });
  config({ path: path.resolve(APP_ROOT, ".env.local") });
}

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

export type RunnerIdentity = { email: string; password: string };

export type SignalSource = {
  once(signal: "SIGINT" | "SIGTERM", listener: (signal: NodeJS.Signals) => void): unknown;
  removeListener(signal: "SIGINT" | "SIGTERM", listener: (signal: NodeJS.Signals) => void): unknown;
};

export type InboxLifecycleDependencies = {
  provision(): Promise<RunnerIdentity>;
  startServer(): Promise<ManagedProcess>;
  waitForServer(server: ManagedProcess): Promise<void>;
  startPlaywright(identity: RunnerIdentity): Promise<ManagedProcess>;
  cleanup(): Promise<void>;
  receiptExists(): boolean;
  releaseLock(): void;
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

export async function runInboxLifecycle(deps: InboxLifecycleDependencies): Promise<number> {
  const signals = deps.signals ?? process;
  let server: ManagedProcess | null = null;
  let playwright: ManagedProcess | null = null;
  let serverStopped = false;
  let playwrightStopped = false;
  let markerState: FixtureMarkerState = "attempt-lock-held";
  let interruptedSignal: NodeJS.Signals | null = null;
  let stopPromise: Promise<void> = Promise.resolve();

  const stopProcesses = async () => {
    if (playwright && !playwrightStopped) {
      playwrightStopped = true;
      await playwright.stop();
    }
    if (server && !serverStopped) {
      serverStopped = true;
      await server.stop();
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
    try {
      const identity = await deps.provision();
      markerState = "receipt-and-lock-held";
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
      if (markerState === "receipt-and-lock-held") {
        throw new InboxMarkerPreservationError({ cause: shutdownError });
      }
      deps.releaseLock();
      markerState = "released";
      throw shutdownError;
    }
    if (markerState === "receipt-and-lock-held") {
      try {
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
  loadLocalEnvironment();
  const datasourceUrl = resolveDatasourceUrl();
  const lock = acquireFixtureLock();
  return runInboxLifecycle({
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
                ...process.env,
                WHATSAPP_SKIP_CLOUD_CREDENTIAL_VALIDATE: "1",
              },
            }
          )
        );
      },
      waitForServer: (server) => waitForHttpReadiness(server),
      async startPlaywright(identity) {
        const playwrightCli = resolveInstalledCli("@playwright/test/cli");
        return managedChild(
          spawn(
            process.execPath,
            [playwrightCli, "test", "tests/e2e/inbox.spec.ts"],
            {
              cwd: APP_ROOT,
              stdio: "inherit",
              detached: process.platform !== "win32",
              windowsHide: true,
              env: {
                ...process.env,
                E2E_WHATSAPP_BASE_URL: SAFE_BASE_URL,
                E2E_WHATSAPP_ADMIN_EMAIL: identity.email,
                E2E_WHATSAPP_ADMIN_PASSWORD: identity.password,
                PLAYWRIGHT_SKIP_WEBSERVER: "1",
              },
            }
          )
        );
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
