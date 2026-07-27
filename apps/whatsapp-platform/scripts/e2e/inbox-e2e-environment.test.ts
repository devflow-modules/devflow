import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { targetFingerprint } from "./inbox-e2e-fixture";
import { resolveInboxE2EEnvironment } from "./inbox-e2e-environment";

const tempDirs: string[] = [];
const processTarget = "postgresql://process@process.example.test/process";
const rootTarget = "postgresql://root@root.example.test/root";
const appTarget = "postgresql://app@app.example.test/app";

function environmentFiles(root?: string, app?: string) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "inbox-env-"));
  tempDirs.push(dir);
  const rootEnvPath = path.join(dir, "root", ".env.local");
  const appEnvPath = path.join(dir, "app", ".env.local");
  if (root !== undefined) {
    fs.mkdirSync(path.dirname(rootEnvPath), { recursive: true });
    fs.writeFileSync(rootEnvPath, root, "utf8");
  }
  if (app !== undefined) {
    fs.mkdirSync(path.dirname(appEnvPath), { recursive: true });
    fs.writeFileSync(appEnvPath, app, "utf8");
  }
  return { rootEnvPath, appEnvPath };
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe("inbox E2E environment resolution", () => {
  it("uses process values when both files are missing", () => {
    const paths = environmentFiles();
    const resolved = resolveInboxE2EEnvironment({
      processEnv: {
        NODE_ENV: "test",
        WHATSAPP_DIRECT_URL: processTarget,
        PROCESS_ONLY: "process",
      },
      ...paths,
    });
    expect(resolved.env.PROCESS_ONLY).toBe("process");
    expect(resolved.datasourceUrl).toBe(processTarget);
  });

  it("lets root values override process values", () => {
    const paths = environmentFiles(`WHATSAPP_DIRECT_URL=${rootTarget}\nSHARED=root\n`);
    const resolved = resolveInboxE2EEnvironment({
      processEnv: {
        NODE_ENV: "test",
        WHATSAPP_DIRECT_URL: processTarget,
        SHARED: "process",
      },
      ...paths,
    });
    expect(resolved.env.SHARED).toBe("root");
    expect(resolved.datasourceUrl).toBe(rootTarget);
  });

  it("lets app values override root and process values", () => {
    const paths = environmentFiles(
      `WHATSAPP_DIRECT_URL=${rootTarget}\nSHARED=root\n`,
      `WHATSAPP_DIRECT_URL=${appTarget}\nSHARED=app\n`
    );
    const resolved = resolveInboxE2EEnvironment({
      processEnv: {
        NODE_ENV: "test",
        WHATSAPP_DIRECT_URL: processTarget,
        SHARED: "process",
      },
      ...paths,
    });
    expect(resolved.env.SHARED).toBe("app");
    expect(resolved.datasourceUrl).toBe(appTarget);
  });

  it("retains root values missing from the app file", () => {
    const paths = environmentFiles(
      `WHATSAPP_DIRECT_URL=${rootTarget}\nROOT_ONLY=retained\n`,
      "APP_ONLY=app\n"
    );
    const resolved = resolveInboxE2EEnvironment({
      processEnv: { NODE_ENV: "test", WHATSAPP_DIRECT_URL: processTarget },
      ...paths,
    });
    expect(resolved.env.ROOT_ONLY).toBe("retained");
    expect(resolved.env.APP_ONLY).toBe("app");
    expect(resolved.datasourceUrl).toBe(rootTarget);
  });

  it("returns the same final values to every caller and fingerprints the final target", () => {
    const paths = environmentFiles(
      `WHATSAPP_DIRECT_URL=${rootTarget}\n`,
      `WHATSAPP_DIRECT_URL=${appTarget}\n`
    );
    const options = {
      processEnv: { NODE_ENV: "test" as const, WHATSAPP_DIRECT_URL: processTarget },
      ...paths,
    };
    const runner = resolveInboxE2EEnvironment(options);
    const provision = resolveInboxE2EEnvironment(options);
    const cleanup = resolveInboxE2EEnvironment(options);
    expect([runner.datasourceUrl, provision.datasourceUrl, cleanup.datasourceUrl]).toEqual([
      appTarget,
      appTarget,
      appTarget,
    ]);
    expect(runner.targetFingerprint).toBe(targetFingerprint(appTarget));
  });

  it("does not mutate or leak file values into the process source", () => {
    const source: NodeJS.ProcessEnv = {
      NODE_ENV: "test",
      WHATSAPP_DIRECT_URL: processTarget,
      SHARED: "process",
    };
    const paths = environmentFiles("SHARED=root\nROOT_SECRET=file-only\n");
    const resolved = resolveInboxE2EEnvironment({ processEnv: source, ...paths });
    expect(resolved.env).not.toBe(source);
    expect(resolved.env.ROOT_SECRET).toBe("file-only");
    expect(source).toEqual({
      NODE_ENV: "test",
      WHATSAPP_DIRECT_URL: processTarget,
      SHARED: "process",
    });
  });
});
