import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it, beforeAll, vi } from "vitest";

import { createE2ESessionToken } from "@/lib/e2e/session";
import { EXTENSION_GRANT_LEGACY_SCOPES, EXTENSION_GRANT_REQUESTABLE_SCOPES } from "@/lib/persistence-v2/personal/extension-grant-scopes";

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "af_e2e_session" && process.env.SCOPES_CHECK_E2E_COOKIE
        ? { value: process.env.SCOPES_CHECK_E2E_COOKIE }
        : undefined,
  }),
}));

const ENABLED = process.env.APPLYFLOW_SCOPES_DEFAULT_CHECK === "1";
const ACCOUNT_ID = "44444444-4444-4444-8444-444444444444";
const EXISTING_GRANT_ID = "55555555-5555-4555-8555-555555555555";
const OMITTED_GRANT_ID = "66666666-6666-4666-8666-666666666666";
const AUTH_SUB = "e2e_applyflow_scopes_default";
const LEGACY_TOKEN = `legacy${"a".repeat(58)}`;
const OMITTED_TOKEN = `omit${"b".repeat(60)}`;

const MIGRATIONS_DIR = path.resolve(__dirname, "../../../../prisma/migrations");
const SCOPES_MIGRATION = "20261020140000_extension_grant_scopes";
const DEFAULT_MIGRATION = "20261020210000_extension_grant_scopes_legacy_default";

function assertDisposableDatabaseUrl(raw: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("SCOPES_CHECK_DATABASE_URL is not a URL");
  }
  if (parsed.hostname !== "127.0.0.1" && parsed.hostname !== "localhost") {
    throw new Error(`Refusing non-local database host: ${parsed.hostname}`);
  }
  if (parsed.port === "5434" || parsed.pathname === "/applyflow") {
    throw new Error("Refusing the existing local ApplyFlow database");
  }
  if (parsed.port !== "5439" || parsed.pathname !== "/applyflow_scopes_check") {
    throw new Error("Refusing unexpected disposable database target");
  }
  return parsed;
}

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function parsePgTextArray(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
    throw new Error(`Unexpected Postgres array text: ${trimmed}`);
  }
  const inner = trimmed.slice(1, -1);
  if (!inner) return [];
  return inner.split(",");
}

const DISPOSABLE_CONTAINER = "applyflow-pg-scopes-check";

function psql(sql: string): string {
  const result = spawnSync(
    "docker",
    [
      "exec",
      "-i",
      DISPOSABLE_CONTAINER,
      "psql",
      "-U",
      "applyflow",
      "-d",
      "applyflow_scopes_check",
      "-v",
      "ON_ERROR_STOP=1",
      "-q",
      "-t",
      "-A",
    ],
    { input: sql, encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "psql failed");
  }
  return result.stdout.trim();
}

function migrationFilesBefore(name: string): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((entry) => entry < name)
    .sort()
    .map((entry) => path.join(MIGRATIONS_DIR, entry, "migration.sql"));
}

describe.skipIf(!ENABLED)("extension grant scopes DEFAULT on disposable Postgres", () => {
  const databaseUrl = process.env.SCOPES_CHECK_DATABASE_URL ?? "";
  let legacyBearer = "";
  let contactsBearer = "";

  beforeAll(async () => {
    assertDisposableDatabaseUrl(databaseUrl);
    process.env.DATABASE_URL = databaseUrl;
    process.env.DIRECT_URL = databaseUrl;
    process.env.APPLYFLOW_DB_TARGET = "local";
    process.env.APPLYFLOW_PERSISTENCE_V2 = "true";
    process.env.APPLYFLOW_PERSISTENCE_V2_ROLLOUT_ACCOUNTS = ACCOUNT_ID;
    process.env.APPLYFLOW_E2E = "1";
    process.env.APPLYFLOW_E2E_SECRET = "applyflow-e2e-local-only-secret";
    process.env.NODE_ENV = "development";
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;

    for (const file of migrationFilesBefore(SCOPES_MIGRATION)) {
      psql(readFileSync(file, "utf8"));
    }

    psql(
      `INSERT INTO applyflow_accounts (
         id, auth_provider_sub, email, pilot_eligible, canonical_persistence, created_at, updated_at
       ) VALUES (
         '${ACCOUNT_ID}', '${AUTH_SUB}', 'scopes-default@example.test', true, 'v1_local', NOW(), NOW()
       );
       INSERT INTO applyflow_extension_grants (id, account_id, token_hash, expires_at)
       VALUES (
         '${EXISTING_GRANT_ID}', '${ACCOUNT_ID}', '${tokenHash(LEGACY_TOKEN)}', NOW() + INTERVAL '7 days'
       );`,
    );

    psql(readFileSync(path.join(MIGRATIONS_DIR, SCOPES_MIGRATION, "migration.sql"), "utf8"));

    const existing = psql(
      `SELECT scopes::text FROM applyflow_extension_grants WHERE id = '${EXISTING_GRANT_ID}'`,
    );
    expect(parsePgTextArray(existing)).toEqual([...EXTENSION_GRANT_LEGACY_SCOPES]);

    psql(readFileSync(path.join(MIGRATIONS_DIR, DEFAULT_MIGRATION, "migration.sql"), "utf8"));

    psql(
      `INSERT INTO applyflow_extension_grants (id, account_id, token_hash, expires_at)
       VALUES (
         '${OMITTED_GRANT_ID}', '${ACCOUNT_ID}', '${tokenHash(OMITTED_TOKEN)}', NOW() + INTERVAL '7 days'
       );`,
    );
    const omitted = parsePgTextArray(
      psql(`SELECT scopes::text FROM applyflow_extension_grants WHERE id = '${OMITTED_GRANT_ID}'`),
    );
    expect(omitted).toEqual([...EXTENSION_GRANT_LEGACY_SCOPES]);
    expect(omitted).not.toContain("contacts:read");
    expect(omitted).not.toContain("contacts:write");

    const { applyFlowExtensionGrants } = await import(
      "@/lib/persistence-v2/personal/extension-grants"
    );
    const minted = await applyFlowExtensionGrants.mint(ACCOUNT_ID, EXTENSION_GRANT_REQUESTABLE_SCOPES);
    expect(minted.scopes).toEqual([...EXTENSION_GRANT_REQUESTABLE_SCOPES]);
    expect(minted.scopes).toContain("contacts:read");
    expect(minted.scopes).toContain("contacts:write");
    contactsBearer = minted.token;
    legacyBearer = LEGACY_TOKEN;

    expect(
      parsePgTextArray(
        psql(
          `SELECT scopes::text FROM applyflow_extension_grants WHERE token_hash = '${tokenHash(minted.token)}'`,
        ),
      ),
    ).toEqual([...EXTENSION_GRANT_REQUESTABLE_SCOPES]);

    const cookie = createE2ESessionToken(process.env, AUTH_SUB);
    if (!cookie) throw new Error("E2E session token was not created");
    process.env.SCOPES_CHECK_E2E_COOKIE = cookie;

    psql(
      `UPDATE applyflow_accounts
       SET canonical_persistence = 'v2_cloud', pilot_eligible = true
       WHERE id = '${ACCOUNT_ID}';`,
    );
  });

  it("returns 403 for a legacy grant on the contacts route", async () => {
    const { GET } = await import("@/app/api/applyflow/v2/contacts/route");
    const response = await GET(
      new Request("http://127.0.0.1:5439/api/applyflow/v2/contacts", {
        headers: { authorization: `Bearer ${legacyBearer}` },
      }),
    );
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "grant_capability_denied",
      scope: "contacts:read",
    });
  });

  it("rejects invalid scopes on the extension session route and does not mint", async () => {
    const beforeCount = psql(
      `SELECT count(*)::text FROM applyflow_extension_grants WHERE account_id = '${ACCOUNT_ID}'`,
    );

    const { POST } = await import("@/app/api/applyflow/v2/extension/session/route");
    const response = await POST(
      new Request("http://127.0.0.1:3010/api/applyflow/v2/extension/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scopes: ["contacts:admin", "profile:read"] }),
      }),
    );
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error?: string };
    expect(body.error).toBe("scopes_required");

    const afterCount = psql(
      `SELECT count(*)::text FROM applyflow_extension_grants WHERE account_id = '${ACCOUNT_ID}'`,
    );
    expect(afterCount).toBe(beforeCount);
    expect(contactsBearer.length).toBeGreaterThan(0);
  });

  it("mints contacts only when the client sends the explicit scope list", async () => {
    const { POST } = await import("@/app/api/applyflow/v2/extension/session/route");
    const response = await POST(
      new Request("http://127.0.0.1:3010/api/applyflow/v2/extension/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scopes: [...EXTENSION_GRANT_REQUESTABLE_SCOPES] }),
      }),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { scopes?: string[] };
    expect(body.scopes).toEqual([...EXTENSION_GRANT_REQUESTABLE_SCOPES]);
  });
});
