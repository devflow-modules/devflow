/**
 * F3.5 read-only environment + DB audit.
 * Prints hosts/fingerprints and counts only — never secrets.
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ALLOWED_SUPABASE_HOST = "qygwhuwvilkekfkgoizb.supabase.co";
const ALLOWED_DB_HOST = "aws-0-sa-east-1.pooler.supabase.com";

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
    if (!(key in process.env) || process.env[key] === "") {
      process.env[key] = value;
    }
  }
}

function hostOf(raw) {
  try {
    // hostname excludes port; pooler URLs often use :6543 / :5432
    return new URL(raw).hostname;
  } catch {
    return "unparseable";
  }
}

function dbOf(raw) {
  try {
    return new URL(raw).pathname.replace(/^\//, "");
  } catch {
    return "?";
  }
}

loadEnvLocal();

const supabaseHost = hostOf(process.env.NEXT_PUBLIC_SUPABASE_URL || "");
const dbHost = hostOf(process.env.DATABASE_URL || "");
const dbName = dbOf(process.env.DATABASE_URL || "");
const isDedicatedDev =
  supabaseHost === ALLOWED_SUPABASE_HOST && dbHost === ALLOWED_DB_HOST;

console.log(
  JSON.stringify(
    {
      supabaseHost,
      dbHost,
      dbName,
      isDedicatedDevFingerprint: isDedicatedDev,
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
    },
    null,
    2,
  ),
);

if (!isDedicatedDev) {
  console.error("F3_5_ENVIRONMENT_UNCERTAIN");
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
