import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import {
  InboxMarkerPreservationError,
  InboxShutdownError,
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
    verifyTargetFingerprint: async () => undefined,
    async provision() {
      events.push("provision");
      return {
        runId: "1234567890abcdef1234567890abcdef",
        email: "fixture@example.invalid",
        password: "not-persisted",
      };
    },
    prepareArtifacts: async () => undefined,
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
    cleanupArtifacts: async () => undefined,
    artifactsAbsent: () => true,
    async cleanup() {
      events.push("cleanup");
    },
    receiptExists() {
      return false;
    },
    releaseLock() {
      events.push("release:lock");
    },
    reportCompletion: () => undefined,
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
      "release:lock",
    ]);
  });

  it("removes and confirms artifacts after shutdown and before database cleanup", async () => {
    const events: string[] = [];
    let absent = false;
    const code = await runInboxLifecycle(
      dependencies(events, {
        async cleanupArtifacts() {
          events.push("cleanup:artifacts");
          absent = true;
        },
        artifactsAbsent() {
          events.push("verify:artifacts-absent");
          return absent;
        },
      })
    );
    expect(code).toBe(0);
    expect(events).toEqual([
      "provision",
      "start:server",
      "ready:server",
      "start:playwright",
      "wait:playwright",
      "stop:playwright",
      "stop:server",
      "cleanup:artifacts",
      "verify:artifacts-absent",
      "cleanup",
      "release:lock",
    ]);
  });

  it.each([
    ["removal failure", async () => {
      throw new Error("private artifact path");
    }, () => true],
    ["absence failure", async () => undefined, () => false],
  ])("preserves receipt and lock on artifact %s", async (_label, cleanupArtifacts, artifactsAbsent) => {
    const events: string[] = [];
    const result = runInboxLifecycle(
      dependencies(events, {
        cleanupArtifacts,
        artifactsAbsent,
      })
    );
    await expect(result).rejects.toEqual(expect.any(InboxMarkerPreservationError));
    await expect(result).rejects.not.toThrow(/private artifact path/);
    expect(events).not.toContain("cleanup");
    expect(events).not.toContain("release:lock");
  });

  it("removes artifacts after a functional failure when integral cleanup succeeds", async () => {
    const events: string[] = [];
    const original = new Error("functional failure");
    const result = runInboxLifecycle(
      dependencies(events, {
        async startPlaywright() {
          return processHandle("playwright", events, async () => {
            throw original;
          });
        },
        async cleanupArtifacts() {
          events.push("cleanup:artifacts");
        },
      })
    );
    await expect(result).rejects.toBe(original);
    expect(events.indexOf("cleanup:artifacts")).toBeGreaterThan(events.indexOf("stop:server"));
    expect(events.indexOf("cleanup")).toBeGreaterThan(events.indexOf("cleanup:artifacts"));
    expect(events).toContain("release:lock");
  });

  it("verifies one target fingerprint for provision, execution and cleanup", async () => {
    const events: string[] = [];
    const stages: string[] = [];
    let reported = false;
    await runInboxLifecycle(
      dependencies(events, {
        verifyTargetFingerprint(stage) {
          stages.push(stage);
        },
        reportCompletion() {
          reported = true;
        },
      })
    );
    expect(stages).toEqual(["provision", "execution", "cleanup"]);
    expect(reported).toBe(true);
  });

  it("fails before database cleanup when the final target diverges", async () => {
    const events: string[] = [];
    const result = runInboxLifecycle(
      dependencies(events, {
        verifyTargetFingerprint(stage) {
          if (stage === "cleanup") throw new Error("target divergence");
        },
      })
    );
    await expect(result).rejects.toEqual(expect.any(InboxMarkerPreservationError));
    expect(events).not.toContain("cleanup");
    expect(events).not.toContain("release:lock");
  });

  it("preserves receipt and lock when post-provision artifact preparation fails", async () => {
    const events: string[] = [];
    const result = runInboxLifecycle(
      dependencies(events, {
        prepareArtifacts() {
          events.push("prepare:artifacts");
          throw new Error("private preparation path");
        },
        async cleanupArtifacts() {
          events.push("cleanup:artifacts");
        },
      })
    );
    await expect(result).rejects.toEqual(expect.any(InboxMarkerPreservationError));
    await expect(result).rejects.not.toThrow(/private preparation path/);
    expect(events).toEqual(["provision", "prepare:artifacts"]);
    expect(events).not.toContain("cleanup");
    expect(events).not.toContain("release:lock");
  });

  it("releases both markers after a thrown Playwright failure and successful cleanup", async () => {
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
    expect(events.slice(-4)).toEqual([
      "stop:playwright",
      "stop:server",
      "cleanup",
      "release:lock",
    ]);
  });

  it("returns a failed Playwright exit after successful cleanup releases both markers", async () => {
    const events: string[] = [];
    const deps = dependencies(events, {
      async startPlaywright() {
        events.push("start:playwright");
        return processHandle("playwright", events, async () => 7);
      },
    });
    await expect(runInboxLifecycle(deps)).resolves.toBe(7);
    expect(events.slice(-4)).toEqual([
      "stop:playwright",
      "stop:server",
      "cleanup",
      "release:lock",
    ]);
  });

  it("preserves artifacts, receipt and lock when process shutdown fails", async () => {
    const events: string[] = [];
    const deps = dependencies(events, {
      async startPlaywright() {
        events.push("start:playwright");
        return {
          wait: async () => {
            events.push("wait:playwright");
            return 0;
          },
          stop: async () => {
            events.push("stop:playwright");
            throw new Error("shutdown failed with private process details");
          },
        };
      },
      async cleanupArtifacts() {
        events.push("cleanup:artifacts");
      },
    });
    const result = runInboxLifecycle(deps);
    await expect(result).rejects.toEqual(expect.any(InboxMarkerPreservationError));
    await expect(result).rejects.not.toThrow(/private process details/);
    expect(events).not.toContain("cleanup");
    expect(events).not.toContain("release:lock");
    expect(events).not.toContain("cleanup:artifacts");
  });

  it("still stops Next when Playwright shutdown fails", async () => {
    const events: string[] = [];
    const deps = dependencies(events, {
      async startPlaywright() {
        events.push("start:playwright");
        return {
          wait: async () => 0,
          stop: async () => {
            events.push("stop:playwright");
            throw new Error("private Playwright details");
          },
        };
      },
    });
    const result = runInboxLifecycle(deps);
    await expect(result).rejects.toEqual(expect.any(InboxMarkerPreservationError));
    expect(events).toContain("stop:server");
    expect(events).not.toContain("cleanup");
  });

  it("still stops Playwright when Next shutdown fails", async () => {
    const events: string[] = [];
    const deps = dependencies(events, {
      async startServer() {
        events.push("start:server");
        return {
          wait: async () => 0,
          stop: async () => {
            events.push("stop:server");
            throw new Error("private Next details");
          },
        };
      },
    });
    const result = runInboxLifecycle(deps);
    await expect(result).rejects.toEqual(expect.any(InboxMarkerPreservationError));
    expect(events).toContain("stop:playwright");
    expect(events).not.toContain("cleanup");
  });

  it("aggregates two sanitized shutdown failures", async () => {
    const events: string[] = [];
    const failingProcess = (name: string): ManagedProcess => ({
      wait: async () => 0,
      stop: async () => {
        events.push(`stop:${name}`);
        throw new Error(`private ${name} details`);
      },
    });
    const deps = dependencies(events, {
      async startServer() {
        events.push("start:server");
        return failingProcess("server");
      },
      async startPlaywright() {
        events.push("start:playwright");
        return failingProcess("playwright");
      },
    });
    const error = await runInboxLifecycle(deps).catch((value: unknown) => value);
    expect(error).toEqual(expect.any(InboxMarkerPreservationError));
    const shutdown = (error as Error & { cause?: unknown }).cause;
    expect(shutdown).toEqual(expect.any(InboxShutdownError));
    expect((shutdown as AggregateError).errors).toHaveLength(2);
    expect(String(shutdown)).toMatch(/Playwright, Next/);
    expect(String(shutdown)).not.toMatch(/private/);
    expect(events).not.toContain("cleanup");
  });

  it("waits for every shutdown attempt before cleanup", async () => {
    const events: string[] = [];
    let finishPlaywright: (() => void) | undefined;
    let finishServer: (() => void) | undefined;
    const deps = dependencies(events, {
      async startServer() {
        events.push("start:server");
        return {
          wait: async () => 0,
          stop: () =>
            new Promise<void>((resolve) => {
              events.push("stop:server");
              finishServer = () => {
                events.push("stopped:server");
                resolve();
              };
            }),
        };
      },
      async startPlaywright() {
        events.push("start:playwright");
        return {
          wait: async () => 0,
          stop: () =>
            new Promise<void>((resolve) => {
              events.push("stop:playwright");
              finishPlaywright = () => {
                events.push("stopped:playwright");
                resolve();
              };
            }),
        };
      },
    });
    const result = runInboxLifecycle(deps);
    await vi.waitFor(() => {
      expect(events).toContain("stop:playwright");
      expect(events).toContain("stop:server");
    });
    expect(events).not.toContain("cleanup");
    finishPlaywright?.();
    await Promise.resolve();
    expect(events).not.toContain("cleanup");
    finishServer?.();
    await expect(result).resolves.toBe(0);
    expect(events.indexOf("cleanup")).toBeGreaterThan(events.indexOf("stopped:server"));
  });

  it("preserves the original execution error before sanitized marker errors", async () => {
    const events: string[] = [];
    const original = new Error("original test failure");
    const deps = dependencies(events, {
      async startPlaywright() {
        events.push("start:playwright");
        return {
          wait: async () => {
            throw original;
          },
          stop: async () => {
            throw new Error("private shutdown details");
          },
        };
      },
    });
    const error = await runInboxLifecycle(deps).catch((value: unknown) => value);
    expect(error).toEqual(expect.any(AggregateError));
    expect((error as AggregateError).errors[0]).toBe(original);
    expect((error as AggregateError).errors[1]).toEqual(
      expect.any(InboxMarkerPreservationError)
    );
    expect(String((error as AggregateError).errors[1])).not.toMatch(/private shutdown details/);
    expect(events).not.toContain("cleanup");
    expect(events).not.toContain("release:lock");
  });

  it("preserves the lock when cleanup resolves but leaves the receipt", async () => {
    const events: string[] = [];
    const deps = dependencies(events, {
      receiptExists: () => true,
    });
    await expect(runInboxLifecycle(deps)).rejects.toEqual(
      expect.any(InboxMarkerPreservationError)
    );
    expect(events).toContain("cleanup");
    expect(events).not.toContain("release:lock");
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
    expect(events.slice(-4)).toEqual([
      "stop:playwright",
      "stop:server",
      "cleanup",
      "release:lock",
    ]);
  });

  it.each(["guard failure", "cleanup failure", "negative verification failure"])(
    "preserves receipt and lock after %s",
    async (failure) => {
      const events: string[] = [];
      const deps = dependencies(events, {
        async cleanup() {
          events.push("cleanup");
          throw new Error(`${failure}: private database details`);
        },
      });
      const result = runInboxLifecycle(deps);
      await expect(result).rejects.toEqual(expect.any(InboxMarkerPreservationError));
      await expect(result).rejects.not.toThrow(/private database details/);
      expect(events).not.toContain("release:lock");
    }
  );

  it("releases the attempt lock when provisioning fails before a receipt remains", async () => {
    const events: string[] = [];
    const deps = dependencies(events, {
      async provision() {
        events.push("provision");
        throw new Error("provision failed");
      },
    });
    await expect(runInboxLifecycle(deps)).rejects.toThrow("provision failed");
    expect(events).toEqual(["provision", "release:lock"]);
  });

  it("preserves markers when failed provisioning leaves a receipt", async () => {
    const events: string[] = [];
    const deps = dependencies(events, {
      async provision() {
        events.push("provision");
        throw new Error("provision failed after receipt");
      },
      receiptExists: () => true,
      async cleanup() {
        events.push("cleanup");
        throw new Error("guard rejected incomplete fixture");
      },
    });
    await expect(runInboxLifecycle(deps)).rejects.toEqual(
      expect.any(InboxMarkerPreservationError)
    );
    expect(events).toEqual(["provision", "cleanup"]);
  });

  it("preserves the lock when a signal arrives and cleanup does not complete", async () => {
    const events: string[] = [];
    const signals = new FakeSignals();
    let releaseWait: ((code: number) => void) | undefined;
    let rejectCleanup: ((error: Error) => void) | undefined;
    let cleanupStarted: (() => void) | undefined;
    const cleanupStartedPromise = new Promise<void>((resolve) => {
      cleanupStarted = resolve;
    });
    const deps = dependencies(events, {
      signals,
      async startPlaywright() {
        events.push("start:playwright");
        return {
          wait: async () => {
            events.push("wait:playwright");
            queueMicrotask(() => signals.emit("SIGTERM"));
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
      cleanup: () => {
        events.push("cleanup");
        cleanupStarted?.();
        return new Promise<void>((_resolve, reject) => {
          rejectCleanup = reject;
        });
      },
    });
    const result = runInboxLifecycle(deps);
    await cleanupStartedPromise;
    expect(events).not.toContain("release:lock");
    rejectCleanup?.(new Error("cleanup interrupted"));
    await expect(result).rejects.toEqual(expect.any(InboxMarkerPreservationError));
    expect(events).not.toContain("release:lock");
  });

  it("preserves fail-closed markers when a signal cannot remove artifacts", async () => {
    const events: string[] = [];
    const signals = new FakeSignals();
    let releaseWait: ((code: number) => void) | undefined;
    const result = runInboxLifecycle(
      dependencies(events, {
        signals,
        async startPlaywright() {
          return {
            wait: async () => {
              queueMicrotask(() => signals.emit("SIGINT"));
              return new Promise<number>((resolve) => {
                releaseWait = resolve;
              });
            },
            stop: async () => {
              releaseWait?.(1);
            },
          };
        },
        async cleanupArtifacts() {
          throw new Error("private removal failure");
        },
      })
    );
    await expect(result).rejects.toEqual(expect.any(InboxMarkerPreservationError));
    await expect(result).rejects.not.toThrow(/private removal failure/);
    expect(events).not.toContain("cleanup");
    expect(events).not.toContain("release:lock");
  });

  it("resolves installed Next and Playwright CLIs without pnpm", () => {
    expect(resolveInstalledCli("next/dist/bin/next")).toMatch(/next[\\/]dist[\\/]bin[\\/]next/);
    expect(resolveInstalledCli("@playwright/test/cli")).toMatch(/playwright[\\/]test[\\/]cli\.js$/);
    const source = fs.readFileSync(fileURLToPath(import.meta.url).replace(/\.test\.ts$/, ".ts"), "utf8");
    expect(source).not.toMatch(/["']pnpm(?:\.cmd)?["']/);
    expect(source).toContain('resolveInstalledCli("next/dist/bin/next")');
    expect(source).toContain('[nextCli, "dev", "-H", "127.0.0.1", "-p", "3099"]');
    expect(source).toContain('PLAYWRIGHT_SKIP_WEBSERVER: "1"');
    expect(source).toContain("E2E_AUTH_STORAGE_STATE_PATH");
    expect(source).toContain("INBOX_E2E_ATTEMPT_ID");
    expect(source).toContain('INBOX_E2E_SAFE_MODE: "1"');
  });
});
