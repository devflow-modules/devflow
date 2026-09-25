import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/** Dedicated ApplyFlow Persistence V2 development Supabase project (F3.2). */
export const APPLYFLOW_DEDICATED_DEV_SUPABASE_HOST = "qygwhuwvilkekfkgoizb.supabase.co";
export const APPLYFLOW_DEDICATED_DEV_DB_HOST = "aws-0-sa-east-1.pooler.supabase.com";

export type ApplyFlowDevEnvironmentReport = {
  ok: boolean;
  supabaseHost: string;
  dbHost: string;
  dbName: string;
  persistenceV2: boolean;
  requiredVarNamesPresent: Record<string, boolean>;
};

function loadEnvLocalIfPresent(): void {
  const candidates = [
    resolve(process.cwd(), ".env.local"),
    resolve(process.cwd(), "apps/applyflow/.env.local"),
  ];
  for (const path of candidates) {
    try {
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
        if (process.env[key] == null || process.env[key] === "") {
          process.env[key] = value;
        }
      }
      return;
    } catch {
      // try next candidate
    }
  }
}

function hostnameOf(raw: string | undefined): string {
  if (!raw) return "missing";
  try {
    return new URL(raw).hostname;
  } catch {
    return "unparseable";
  }
}

function dbNameOf(raw: string | undefined): string {
  if (!raw) return "missing";
  try {
    return new URL(raw).pathname.replace(/^\//, "") || "?";
  } catch {
    return "unparseable";
  }
}

/**
 * Prove the configured DATABASE_URL / Supabase URL match the dedicated
 * development project. Never logs secrets or full connection strings.
 */
export function assertApplyFlowDedicatedDevEnvironment(): ApplyFlowDevEnvironmentReport {
  loadEnvLocalIfPresent();
  const supabaseHost = hostnameOf(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const dbHost = hostnameOf(process.env.DATABASE_URL);
  const dbName = dbNameOf(process.env.DATABASE_URL);
  const requiredVarNamesPresent = {
    NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
    DIRECT_URL: Boolean(process.env.DIRECT_URL),
    APPLYFLOW_PERSISTENCE_V2: Boolean(process.env.APPLYFLOW_PERSISTENCE_V2),
  };
  const ok =
    supabaseHost === APPLYFLOW_DEDICATED_DEV_SUPABASE_HOST &&
    dbHost === APPLYFLOW_DEDICATED_DEV_DB_HOST &&
    requiredVarNamesPresent.NEXT_PUBLIC_SUPABASE_URL &&
    requiredVarNamesPresent.DATABASE_URL &&
    requiredVarNamesPresent.DIRECT_URL &&
    process.env.APPLYFLOW_PERSISTENCE_V2 === "true";

  return {
    ok,
    supabaseHost,
    dbHost,
    dbName,
    persistenceV2: process.env.APPLYFLOW_PERSISTENCE_V2 === "true",
    requiredVarNamesPresent,
  };
}
