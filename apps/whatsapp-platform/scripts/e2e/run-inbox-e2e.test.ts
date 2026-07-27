import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  resolveInstalledCli,
  runInboxLifecycle,
  type InboxLifecycleDependencies,
  type ManagedProcess,
  type SignalSource,
} from "./run-inbox-e2e";

class FakeSignals implements SignalSource {
  private listeners = new Map<string, (signal: NodeJS.Signals) => void>();

  once(signal: "SIGINT" | "SIGTERM", listener: (signal: NodeJS.Signals) => void) {
    this.listeners.set(signal, listener);
  }

  removeListener(signal: "SIGINT" | "SIGTERM") {
    this.listeners.delete(signal);
  }

  emit(signal: "SIGINT" | "SIGTERM") {
    this.listeners.get(signal)?.(signal);
  }
}

function processHandle(
  name: string,
  events: string[],
  wait: () => Promise<number>
): ManagedProcess {
  return {
    async wait() {
      events.push(`wait:${name}`);
      return wait();
    },
    async stop() {
      events.push(`stop:${name}`);
    },
  };
}

function dependencies(
  events: string[],
  overrides: Partial<InboxLifecycleDependencies> = {}
): InboxLifecycleDependencies {
  const signals = new FakeSignals();
  return {
    signals,
    async provision() {
      events.push("provision");
      return { email: "fixture@example.invalid", password: "not-persisted" };
    },
    async startServer() {
      events.push("start:server");
      return processHandle("server", events, async () => 0);
    },
    async waitForServer() {
      events.push("ready:server");
    },
    async startPlaywright() {
      events.push("start:playwright");
      return processHandle("playwright", events, async () => 0);
    },
    async cleanup() {
      events.push("cleanup");
    },
    ...overrides,
  };
}

describe("safe inbox process lifecycle", () => {
  it("stops Playwright then Next before cleanup", async () => {
    const events: string[] = [];
    const code = await runInboxLifecycle(dependencies(events));
    expect(code).toBe(0);
    expect(events).toEqual([
      "provision",
      "start:server",
      "ready:server",
      "start:playwright",
      "wait:playwright",
      "stop:playwright",
      "stop:server",
      "cleanup",
    ]);
  });

  it("cleans up after Playwright failure only after both process stops", async () => {
    const events: string[] = [];
    const deps = dependencies(events, {
      async startPlaywright() {
        events.push("start:playwright");
        return processHandle("playwright", events, async () => {
          throw new Error("Playwright failed");
        });
      },
    });
    await expect(runInboxLifecycle(deps)).rejects.toThrow("Playwright failed");
    expect(events.slice(-3)).toEqual(["stop:playwright", "stop:server", "cleanup"]);
  });

  it("preserves a nonzero Playwright result after cleanup", async () => {
    const events: string[] = [];
    const deps = dependencies(events, {
      async startPlaywright() {
        events.push("start:playwright");
        return processHandle("playwright", events, async () => 7);
      },
    });
    await expect(runInboxLifecycle(deps)).resolves.toBe(7);
    expect(events.slice(-3)).toEqual(["stop:playwright", "stop:server", "cleanup"]);
  });

  it.each([
    ["SIGINT", 130],
    ["SIGTERM", 143],
  ] as const)("stops and cleans on %s", async (signal, expectedCode) => {
    const events: string[] = [];
    const signals = new FakeSignals();
    let releaseWait: ((code: number) => void) | undefined;
    const deps = dependencies(events, {
      signals,
      async startPlaywright() {
        events.push("start:playwright");
        return {
          wait: async () => {
            events.push("wait:playwright");
            queueMicrotask(() => signals.emit(signal));
            return new Promise<number>((resolve) => {
              releaseWait = resolve;
            });
          },
          stop: async () => {
            events.push("stop:playwright");
            releaseWait?.(1);
          },
        };
      },
    });
    await expect(runInboxLifecycle(deps)).resolves.toBe(expectedCode);
    expect(events.slice(-3)).toEqual(["stop:playwright", "stop:server", "cleanup"]);
  });

  it("resolves installed Next and Playwright CLIs without pnpm", () => {
    expect(resolveInstalledCli("next/dist/bin/next")).toMatch(/next[\\/]dist[\\/]bin[\\/]next/);
    expect(resolveInstalledCli("@playwright/test/cli")).toMatch(/playwright[\\/]test[\\/]cli\.js$/);
    const source = fs.readFileSync(fileURLToPath(import.meta.url).replace(/\.test\.ts$/, ".ts"), "utf8");
    expect(source).not.toMatch(/["']pnpm(?:\.cmd)?["']/);
    expect(source).toContain('resolveInstalledCli("next/dist/bin/next")');
    expect(source).toContain('[nextCli, "dev", "-H", "127.0.0.1", "-p", "3099"]');
    expect(source).toContain('PLAYWRIGHT_SKIP_WEBSERVER: "1"');
  });
});
