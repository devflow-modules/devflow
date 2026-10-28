/**
 * Unit coverage for CI release-gate helpers (F2/F3 style).
 * Spawns no remotes; never prints env values.
 */
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const gates = require(path.resolve(
  process.cwd(),
  "scripts/ci/release-gates.cjs",
)) as {
  assertCiDisposableDb: (env?: NodeJS.ProcessEnv) => void;
  assertIsolatedBuildEnv: (env?: NodeJS.ProcessEnv) => void;
  GateError: new (code: number, message: string) => Error & { code: number };
};

const SYNTHETIC_BUILD_DB =
  "postgresql://ci_build:ci_build@db.ci-build-isolated.invalid:5432/applyflow";
const CI_DB = "postgresql://applyflow:applyflow_local_dev@localhost:5434/applyflow";

describe("ci release-gates helper", () => {
  it("accepts disposable CI Postgres on localhost:5434", () => {
    expect(() =>
      gates.assertCiDisposableDb({
        APPLYFLOW_DB_TARGET: "local",
        DATABASE_URL: CI_DB,
        DIRECT_URL: "postgresql://applyflow:applyflow_local_dev@127.0.0.1:5434/applyflow",
      }),
    ).not.toThrow();
  });

  it("F3 — rejects nonlocal DATABASE_URL without connecting", () => {
    expect(() =>
      gates.assertCiDisposableDb({
        APPLYFLOW_DB_TARGET: "local",
        DATABASE_URL: "postgresql://u:p@db.preview-synthetic.invalid:5432/applyflow",
        DIRECT_URL: "postgresql://u:p@db.preview-synthetic.invalid:5432/applyflow",
      }),
    ).toThrow(/non_local|disposable/i);
  });

  it("accepts isolated build env with synthetic DB and Preview markers", () => {
    expect(() =>
      gates.assertIsolatedBuildEnv({
        VERCEL: "1",
        VERCEL_ENV: "preview",
        DATABASE_URL: SYNTHETIC_BUILD_DB,
        DIRECT_URL: SYNTHETIC_BUILD_DB,
      }),
    ).not.toThrow();
  });

  it("F2 — rejects prohibited credential names without printing values", () => {
    try {
      gates.assertIsolatedBuildEnv({
        VERCEL: "1",
        VERCEL_ENV: "preview",
        DATABASE_URL: SYNTHETIC_BUILD_DB,
        DIRECT_URL: SYNTHETIC_BUILD_DB,
        OPENAI_API_KEY: "synthetic-not-a-real-key",
      });
      expect.unreachable("expected GateError");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      expect(message).toContain("OPENAI_API_KEY");
      expect(message).not.toContain("synthetic-not-a-real-key");
    }
  });

  it("rejects Production-like host markers in isolated build URLs", () => {
    expect(() =>
      gates.assertIsolatedBuildEnv({
        VERCEL: "1",
        VERCEL_ENV: "preview",
        DATABASE_URL: "postgresql://u:p@aws-0-sa-east-1.pooler.supabase.com:6543/postgres",
        DIRECT_URL: "postgresql://u:p@aws-0-sa-east-1.pooler.supabase.com:6543/postgres",
      }),
    ).toThrow(/forbidden remote host marker/i);
  });
});
