/**
 * F3.5 read-only environment + DB audit.
 * Prints hosts/classification and counts only — never secrets.
 *
 * Destructive follow-ups must target local/ephemeral Postgres only.
 * Production project qygwhuwvilkekfkgoizb is always DENY.
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const PRODUCTION_REF = "qygwhuwvilkekfkgoizb";
const PRODUCTION_HOST = `${PRODUCTION_REF}.supabase.co`;
const SAFE_HOSTS = new Set(["localhost", "127.0.0.1"]);

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    // Prefer .env.local over inherited shell/user env.
    process.env[key] = value;
  }
}

function hostOf(raw) {
  if (!raw || !String(raw).trim()) return "missing";
  try {
    return new URL(raw).hostname;
  } catch {
    return "unparseable";
  }
}

function dbOf(raw) {
  if (!raw || !String(raw).trim()) return "missing";
  try {
    return new URL(raw).pathname.replace(/^\//, "");
  } catch {
    return "?";
  }
}

function isSupabaseHost(host) {
  return (
    host === "supabase.co" ||
    host.endsWith(".supabase.co") ||
    host === "supabase.com" ||
    host.endsWith(".supabase.com")
  );
}

function classify(env) {
  const dbHost = hostOf(env.DATABASE_URL || "");
  const directHost = hostOf(env.DIRECT_URL || "");
  const supabaseHost = hostOf(env.NEXT_PUBLIC_SUPABASE_URL || "");
  const dbName = dbOf(env.DATABASE_URL || "");
  const blob = `${env.DATABASE_URL || ""}${env.DIRECT_URL || ""}${env.NEXT_PUBLIC_SUPABASE_URL || ""}`;
  if (!env.DATABASE_URL) {
    return { kind: "missing", allowed: false, dbHost, supabaseHost, dbName };
  }
  if (dbHost === "unparseable") {
    return { kind: "unparseable", allowed: false, dbHost, supabaseHost, dbName };
  }
  if (supabaseHost === PRODUCTION_HOST || blob.includes(PRODUCTION_REF)) {
    return { kind: "production", allowed: false, dbHost, supabaseHost, dbName };
  }
  if (isSupabaseHost(dbHost) || isSupabaseHost(directHost) || isSupabaseHost(supabaseHost)) {
    return { kind: "supabase_remote", allowed: false, dbHost, supabaseHost, dbName };
  }
  const hosts = [dbHost, ...(env.DIRECT_URL ? [directHost] : [])];
  if (hosts.every((h) => SAFE_HOSTS.has(h))) {
    return { kind: "safe_local", allowed: true, dbHost, supabaseHost, dbName };
  }
  return { kind: "unknown_remote", allowed: false, dbHost, supabaseHost, dbName };
}

loadEnvLocal();
const classification = classify(process.env);

console.log(
  JSON.stringify(
    {
      classification,
      persistenceV2: process.env.APPLYFLOW_PERSISTENCE_V2 === "true",
      requiredVarNamesPresent: {
        NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: Boolean(
          process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        ),
        DATABASE_URL: Boolean(process.env.DATABASE_URL),
        DIRECT_URL: Boolean(process.env.DIRECT_URL),
        APPLYFLOW_PERSISTENCE_V2: Boolean(process.env.APPLYFLOW_PERSISTENCE_V2),
      },
      note: "Destructive E2E requires kind=safe_local. Production project is denylisted.",
    },
    null,
    2,
  ),
);

if (classification.kind === "production") {
  console.error("APPLYFLOW_PRODUCTION_DB_DENIED");
  process.exit(4);
}

if (!classification.allowed) {
  console.error("APPLYFLOW_DB_TARGET_DENIED");
  process.exit(3);
}

const prisma = new PrismaClient();
try {
  const [accounts, jobs, applications, migrationSessions] = await Promise.all([
    prisma.applyFlowAccount.count(),
    prisma.applyFlowJob.count(),
    prisma.applyFlowApplication.count(),
    prisma.applyFlowMigrationSession.count(),
  ]);
  let authUsers = null;
  try {
    const rows = await prisma.$queryRawUnsafe(
      "select count(*)::int as c from auth.users",
    );
    authUsers = rows[0]?.c ?? null;
  } catch {
    authUsers = "unavailable";
  }
  console.log(
    JSON.stringify(
      { accounts, jobs, applications, migrationSessions, authUsers },
      null,
      2,
    ),
  );
} finally {
  await prisma.$disconnect();
}
