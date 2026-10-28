/**
 * ApplyFlow CI release gates — fail-closed preflight helpers.
 *
 * Modes:
 *   assert-ci-db              Disposable CI Postgres only (localhost|127.0.0.1:5434).
 *   assert-isolated-build-env Reject prohibited credential env names; require preview markers.
 *   assert-no-secret-env-files Refuse real .env* beside .env.example in apps/applyflow.
 *   self-test                 Local failure-injection (F1–F4). Never contacts remotes.
 *
 * Never prints env values or connection strings — only variable names / host kinds.
 */
"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const APP_ROOT = path.resolve(__dirname, "../..");
const REPO_ROOT = path.resolve(APP_ROOT, "../..");

/** CI disposable Postgres contract (matches .github/workflows/ci.yml service). */
const CI_DB_PORT = "5434";
const CI_DB_HOSTS = new Set(["localhost", "127.0.0.1"]);

/**
 * Prohibited for the isolated Next.js build step when non-empty.
 * Names only — never read or echo values.
 */
const PROHIBITED_ISOLATED_BUILD_ENV_NAMES = Object.freeze([
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_SECRET_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_SECRET",
  "STRIPE_WEBHOOK_SECRET",
  "WHATSAPP_TOKEN",
  "WHATSAPP_ACCESS_TOKEN",
  "WHATSAPP_API_TOKEN",
  "META_APP_SECRET",
  "META_WEBHOOK_SECRET",
  "THEIRSTACK_API_KEY",
  "APPLYFLOW_THEIRSTACK_API_KEY",
  "OPENAI_API_KEY",
  "NANGO_SECRET_KEY",
  "NANGO_SECRET",
  "SENTRY_AUTH_TOKEN",
  "APPLYFLOW_SENTRY_AUTH_TOKEN",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "SUPABASE_DB_URL",
]);

const FORBIDDEN_DB_HOST_FRAGMENTS = Object.freeze([
  "supabase.co",
  "supabase.com",
  "pooler.supabase",
  "neon.tech",
  "amazonaws.com",
  "qygwhuwvilkekfkgoizb",
]);

class GateError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ApplyFlowCiReleaseGateError";
    this.code = code;
  }
}

function logOk(message) {
  console.log(`[applyflow-ci-release-gates] ${message}`);
}

function logErr(message) {
  console.error(`[applyflow-ci-release-gates] ${message}`);
}

function hostnameOf(raw) {
  if (!raw || !String(raw).trim()) return { host: "missing", port: "" };
  try {
    const u = new URL(raw);
    return { host: u.hostname || "missing", port: u.port || "" };
  } catch {
    return { host: "unparseable", port: "" };
  }
}

function envHasNonEmpty(name, env) {
  const v = env[name];
  return typeof v === "string" && v.trim().length > 0;
}

function containsForbiddenDbMarker(raw) {
  const lower = String(raw).toLowerCase();
  return FORBIDDEN_DB_HOST_FRAGMENTS.find((frag) => lower.includes(frag)) || null;
}

function isSyntheticIsolatedHost(host) {
  return host.includes("invalid") || host.endsWith(".test") || host.includes("ci-build-isolated");
}

/**
 * Assert disposable CI Postgres target. No connection attempt.
 */
function assertCiDisposableDb(env = process.env) {
  if ((env.APPLYFLOW_DB_TARGET || "").trim().toLowerCase() !== "local") {
    throw new GateError(1, "APPLYFLOW_DB_TARGET must be 'local' for CI database steps.");
  }

  for (const name of ["DATABASE_URL", "DIRECT_URL"]) {
    if (!envHasNonEmpty(name, env)) {
      throw new GateError(1, `${name} is required for CI database steps.`);
    }
    const { host, port } = hostnameOf(env[name]);
    if (!CI_DB_HOSTS.has(host)) {
      throw new GateError(
        1,
        `${name} host is not disposable CI Postgres (hostKind=${host === "unparseable" ? "unparseable" : "non_local"}).`,
      );
    }
    if (port !== CI_DB_PORT) {
      throw new GateError(1, `${name} must use port ${CI_DB_PORT} (disposable CI service).`);
    }
    const forbidden = containsForbiddenDbMarker(env[name]);
    if (forbidden) {
      throw new GateError(1, `${name} matches a forbidden remote host marker (${forbidden}).`);
    }
  }

  logOk("CI disposable Postgres target accepted (localhost|127.0.0.1:5434, APPLYFLOW_DB_TARGET=local).");
}

/**
 * Isolated build env: preview markers + no prohibited credential names with values.
 * DATABASE_URL / DIRECT_URL must be synthetic non-local hosts.
 */
function assertIsolatedBuildEnv(env = process.env) {
  if (env.VERCEL !== "1") {
    throw new GateError(1, "Isolated build requires VERCEL=1.");
  }
  if ((env.VERCEL_ENV || "").trim() !== "preview") {
    throw new GateError(1, "Isolated build requires VERCEL_ENV=preview (exact).");
  }

  for (const name of PROHIBITED_ISOLATED_BUILD_ENV_NAMES) {
    if (envHasNonEmpty(name, env)) {
      throw new GateError(1, `Prohibited environment variable present for isolated build: ${name}`);
    }
  }

  for (const name of ["DATABASE_URL", "DIRECT_URL"]) {
    if (!envHasNonEmpty(name, env)) {
      throw new GateError(1, `${name} must be set to a synthetic isolated-build URL.`);
    }
    const { host } = hostnameOf(env[name]);
    if (CI_DB_HOSTS.has(host)) {
      throw new GateError(1, `${name} must not point at the CI Postgres service during isolated build.`);
    }
    if (host === "missing" || host === "unparseable") {
      throw new GateError(1, `${name} is missing or unparseable for isolated build.`);
    }
    const forbidden = containsForbiddenDbMarker(env[name]);
    if (forbidden) {
      throw new GateError(1, `${name} matches a forbidden remote host marker (${forbidden}).`);
    }
    if (!isSyntheticIsolatedHost(host)) {
      throw new GateError(
        1,
        `${name} host must be a synthetic isolated marker (*.invalid / *.test / *ci-build-isolated*).`,
      );
    }
  }

  logOk("Isolated build environment accepted (VERCEL preview + synthetic DB + no prohibited credentials).");
}

function assertNoSecretEnvFiles(appRoot = APP_ROOT) {
  const entries = fs.readdirSync(appRoot, { withFileTypes: true });
  const secret = entries
    .filter((d) => d.isFile() && d.name.startsWith(".env") && d.name !== ".env.example")
    .map((d) => d.name);
  if (secret.length > 0) {
    throw new GateError(1, `Secret env files present in apps/applyflow: ${secret.join(", ")}`);
  }
  logOk("No secret .env* files in apps/applyflow checkout.");
}

function runSelfTest() {
  let failures = 0;

  function expectFail(label, fn) {
    try {
      fn();
      logErr(`F-FAIL ${label}: expected GateError`);
      failures += 1;
    } catch (err) {
      if (err instanceof GateError) {
        logOk(`F-PASS ${label} (code=${err.code})`);
        return;
      }
      logErr(`F-FAIL ${label}: unexpected throw — ${err && err.message ? err.message : err}`);
      failures += 1;
    }
  }

  function expectOk(label, fn) {
    try {
      fn();
      logOk(`F-PASS ${label}`);
    } catch (err) {
      logErr(`F-FAIL ${label}: ${err && err.message ? err.message : err}`);
      failures += 1;
    }
  }

  // F2 — prohibited credential name
  expectFail("F2_prohibited_credential", () => {
    assertIsolatedBuildEnv({
      VERCEL: "1",
      VERCEL_ENV: "preview",
      DATABASE_URL: "postgresql://u:p@db.ci-build-isolated.invalid:5432/applyflow",
      DIRECT_URL: "postgresql://u:p@db.ci-build-isolated.invalid:5432/applyflow",
      OPENAI_API_KEY: "synthetic-not-a-real-key",
    });
  });

  // F3 — nonlocal DATABASE_URL for CI db assert (no connection)
  expectFail("F3_invalid_database_target", () => {
    assertCiDisposableDb({
      APPLYFLOW_DB_TARGET: "local",
      DATABASE_URL: "postgresql://u:p@db.preview-synthetic.invalid:5432/applyflow",
      DIRECT_URL: "postgresql://u:p@db.preview-synthetic.invalid:5432/applyflow",
    });
  });

  expectOk("F3_control_local_ci_db", () => {
    assertCiDisposableDb({
      APPLYFLOW_DB_TARGET: "local",
      DATABASE_URL: "postgresql://applyflow:applyflow_local_dev@localhost:5434/applyflow",
      DIRECT_URL: "postgresql://applyflow:applyflow_local_dev@127.0.0.1:5434/applyflow",
    });
  });

  expectOk("F2_control_isolated_build", () => {
    assertIsolatedBuildEnv({
      VERCEL: "1",
      VERCEL_ENV: "preview",
      DATABASE_URL: "postgresql://build_user:build_pass@db.ci-build-isolated.invalid:5432/applyflow",
      DIRECT_URL: "postgresql://build_user:build_pass@db.ci-build-isolated.invalid:5432/applyflow",
    });
  });

  // F1 — TypeScript error in synthetic fixture (temp only; no tracked source change)
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "applyflow-ci-f1-"));
  try {
    const badFile = path.join(tmpDir, "bad.ts");
    fs.writeFileSync(badFile, "export const x: number = 'not-a-number';\n", "utf8");
    const tsconfig = path.join(tmpDir, "tsconfig.json");
    fs.writeFileSync(
      tsconfig,
      JSON.stringify({
        compilerOptions: {
          strict: true,
          noEmit: true,
          target: "ES2022",
          module: "NodeNext",
          moduleResolution: "NodeNext",
        },
        include: ["bad.ts"],
      }),
      "utf8",
    );
    const tscBin = path.join(REPO_ROOT, "node_modules", "typescript", "bin", "tsc");
    const tscAlt = path.join(APP_ROOT, "node_modules", "typescript", "bin", "tsc");
    const tscPath = fs.existsSync(tscBin) ? tscBin : tscAlt;
    if (!fs.existsSync(tscPath)) {
      logErr("F-FAIL F1_typescript_error: tsc binary not found");
      failures += 1;
    } else {
      const f1 = spawnSync(process.execPath, [tscPath, "--noEmit", "-p", tsconfig], {
        encoding: "utf8",
      });
      if (f1.status && f1.status !== 0) {
        logOk(`F-PASS F1_typescript_error (exit=${f1.status})`);
      } else {
        logErr("F-FAIL F1_typescript_error: tsc unexpectedly succeeded");
        failures += 1;
      }
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  // F4 — controlled synthetic build failure propagates nonzero
  const f4 = spawnSync(process.execPath, ["-e", "process.exit(17)"], { encoding: "utf8" });
  if (f4.status === 17) {
    logOk("F-PASS F4_build_failure_propagation (exit=17)");
  } else {
    logErr(`F-FAIL F4_build_failure_propagation: status=${f4.status}`);
    failures += 1;
  }

  if (failures > 0) {
    throw new GateError(1, `self-test failed (${failures} case(s)).`);
  }
  logOk("self-test passed (F1–F4).");
}

function runMode(mode) {
  switch (mode) {
    case "assert-ci-db":
      assertCiDisposableDb();
      break;
    case "assert-isolated-build-env":
      assertIsolatedBuildEnv();
      break;
    case "assert-no-secret-env-files":
      assertNoSecretEnvFiles();
      break;
    case "self-test":
      runSelfTest();
      break;
    default:
      throw new GateError(
        2,
        "Usage: node scripts/ci/release-gates.cjs <assert-ci-db|assert-isolated-build-env|assert-no-secret-env-files|self-test>",
      );
  }
}

function main(argv) {
  try {
    runMode(argv[0]);
  } catch (err) {
    if (err instanceof GateError) {
      logErr(err.message);
      process.exit(err.code);
    }
    throw err;
  }
}

module.exports = {
  assertCiDisposableDb,
  assertIsolatedBuildEnv,
  assertNoSecretEnvFiles,
  GateError,
  PROHIBITED_ISOLATED_BUILD_ENV_NAMES,
  CI_DB_PORT,
};

if (require.main === module) {
  main(process.argv.slice(2));
}
