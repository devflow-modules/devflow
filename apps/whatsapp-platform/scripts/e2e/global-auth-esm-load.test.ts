import childProcess from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { describe, expect, it, vi } from "vitest";

type ESMLoaderHost = {
  registerESMLoader(): boolean;
  configureESMLoader(): Promise<void>;
  configureESMLoaderTransformConfig(): Promise<void>;
};

type PlaywrightTransform = {
  requireOrImport(file: string): Promise<unknown>;
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, "../..");
const configPath = path.join(appRoot, "playwright.config.cjs");
const expectedSetupPath = path.join(
  appRoot,
  "tests",
  "setup",
  "global-auth.setup.mts"
);
const receiptPath = path.join(appRoot, "tests", ".auth", "inbox-e2e-fixture.json");
const lockPath = path.join(appRoot, "tests", ".auth", "inbox-e2e-fixture.lock");
const incompatibleFixturePath = path.join(
  scriptDir,
  "fixtures",
  "cjs-emitted-as-esm.mjs"
);

function configuredGlobalSetupPath(): string {
  const configSource = fs.readFileSync(configPath, "utf8");
  const matches = [
    ...configSource.matchAll(
      /\bglobalSetup\s*:\s*require\.resolve\(\s*(["'])([^"']+)\1\s*\)/g
    ),
  ];
  if (matches.length !== 1 || !matches[0]?.[2]) {
    throw new Error("Playwright config must declare one static globalSetup path");
  }
  return createRequire(configPath).resolve(matches[0][2]);
}

function transitiveSourcePaths(setupPath: string): string[] {
  return [
    setupPath,
    path.join(scriptDir, "inbox-e2e-artifacts.ts"),
    path.join(scriptDir, "inbox-e2e-fixture.ts"),
    path.join(appRoot, "tests", "e2e", "helpers", "whatsapp-auth-state.mts"),
  ];
}

function playwrightLoader(): {
  loaderHost: ESMLoaderHost;
  transform: PlaywrightTransform;
} {
  const requireFromHere = createRequire(import.meta.url);
  const playwrightPackageJson = requireFromHere.resolve("@playwright/test/package.json");
  const requireFromPlaywright = createRequire(playwrightPackageJson);
  const configLoaderPath = requireFromPlaywright.resolve(
    "playwright/lib/common/configLoader"
  );
  return {
    loaderHost: requireFromPlaywright(
      path.join(path.dirname(configLoaderPath), "esmLoaderHost.js")
    ) as ESMLoaderHost,
    transform: requireFromPlaywright(
      "playwright/lib/transform/transform"
    ) as PlaywrightTransform,
  };
}

function markerState(filePath: string): { exists: boolean; modifiedAt?: number } {
  try {
    return { exists: true, modifiedAt: fs.statSync(filePath).mtimeMs };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { exists: false };
    throw error;
  }
}

function targetsPath(call: unknown[], expectedPath: string): boolean {
  const target = call[0];
  return (
    (typeof target === "string" || target instanceof URL) &&
    path.resolve(target instanceof URL ? fileURLToPath(target) : target) ===
      path.resolve(expectedPath)
  );
}

describe("Playwright global setup ESM boundary", () => {
  it("loads the real setup through Playwright without running side effects", async () => {
    const beforeReceipt = markerState(receiptPath);
    const beforeLock = markerState(lockPath);
    const { loaderHost, transform } = playwrightLoader();

    const spawnSpy = vi.spyOn(childProcess, "spawn").mockImplementation(() => {
      throw new Error("child process execution is forbidden while loading global setup");
    });
    const chromiumSpy = vi.spyOn(chromium, "launch").mockRejectedValue(
      new Error("Chromium launch is forbidden while loading global setup")
    );
    const writeSpy = vi.spyOn(fs, "writeFileSync");
    const openSpy = vi.spyOn(fs, "openSync");
    const renameSpy = vi.spyOn(fs, "renameSync");
    const unlinkSpy = vi.spyOn(fs, "unlinkSync");
    const rmSpy = vi.spyOn(fs, "rmSync");
    const consoleSpies = [
      vi.spyOn(console, "log").mockImplementation(() => undefined),
      vi.spyOn(console, "info").mockImplementation(() => undefined),
      vi.spyOn(console, "warn").mockImplementation(() => undefined),
      vi.spyOn(console, "error").mockImplementation(() => undefined),
    ];
    const secretSentinels = ["loader-test-email-secret", "loader-test-password-secret"];
    const previousEmail = process.env.E2E_WHATSAPP_ADMIN_EMAIL;
    const previousPassword = process.env.E2E_WHATSAPP_ADMIN_PASSWORD;
    process.env.E2E_WHATSAPP_ADMIN_EMAIL = secretSentinels[0];
    process.env.E2E_WHATSAPP_ADMIN_PASSWORD = secretSentinels[1];

    try {
      const setupPath = configuredGlobalSetupPath();
      expect(path.extname(setupPath)).toBe(".mts");
      expect(path.resolve(setupPath)).toBe(path.resolve(expectedSetupPath));

      expect(loaderHost.registerESMLoader()).toBe(true);
      await loaderHost.configureESMLoader();
      await loaderHost.configureESMLoaderTransformConfig();

      const loaded = (await transform.requireOrImport(setupPath)) as {
        default?: unknown;
      };
      expect(loaded).toBeTypeOf("object");
      expect(loaded.default).toBeTypeOf("function");

      for (const sourcePath of transitiveSourcePaths(setupPath)) {
        const source = fs.readFileSync(sourcePath, "utf8");
        expect(source).not.toMatch(
          /\b(?:module\.exports|exports\.|require\s*\(|__dirname\b|__filename\b|export\s*=)/
        );
      }

      expect(spawnSpy).not.toHaveBeenCalled();
      expect(chromiumSpy).not.toHaveBeenCalled();
      for (const spy of [writeSpy, openSpy, renameSpy, unlinkSpy, rmSpy]) {
        expect(spy.mock.calls.some((call) => targetsPath(call, receiptPath))).toBe(false);
        expect(spy.mock.calls.some((call) => targetsPath(call, lockPath))).toBe(false);
      }
      expect(markerState(receiptPath)).toEqual(beforeReceipt);
      expect(markerState(lockPath)).toEqual(beforeLock);
      expect(process.env.E2E_WHATSAPP_ADMIN_EMAIL).toBe(secretSentinels[0]);
      expect(process.env.E2E_WHATSAPP_ADMIN_PASSWORD).toBe(secretSentinels[1]);

      const consoleOutput = consoleSpies
        .flatMap((spy) => spy.mock.calls)
        .flat()
        .map(String)
        .join(" ");
      for (const secret of secretSentinels) expect(consoleOutput).not.toContain(secret);
    } finally {
      if (previousEmail === undefined) delete process.env.E2E_WHATSAPP_ADMIN_EMAIL;
      else process.env.E2E_WHATSAPP_ADMIN_EMAIL = previousEmail;
      if (previousPassword === undefined) delete process.env.E2E_WHATSAPP_ADMIN_PASSWORD;
      else process.env.E2E_WHATSAPP_ADMIN_PASSWORD = previousPassword;
      vi.restoreAllMocks();
    }
  });

  it("rejects CommonJS output evaluated as an ES module", async () => {
    const { loaderHost, transform } = playwrightLoader();
    expect(loaderHost.registerESMLoader()).toBe(true);
    await loaderHost.configureESMLoader();
    await loaderHost.configureESMLoaderTransformConfig();
    await expect(transform.requireOrImport(incompatibleFixturePath)).rejects.toThrow(
      /exports is not defined/i
    );
  });
});
