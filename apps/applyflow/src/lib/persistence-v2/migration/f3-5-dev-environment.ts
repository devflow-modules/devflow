/**
 * F3.5 environment helpers — destructive targets must be local/ephemeral only.
 *
 * The former "dedicated DEV" Supabase project (qygwhuwvilkekfkgoizb) is now
 * ApplyFlow PRODUCTION and is structurally denylisted.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  APPLYFLOW_PRODUCTION_SUPABASE_HOST,
  APPLYFLOW_PRODUCTION_SUPABASE_PROJECT_REF,
  assertApplyFlowDestructiveDbTargetAllowed,
  classifyApplyFlowDbTarget,
  type ApplyFlowDbTargetClassification,
  type ApplyFlowDevEnvironmentReport,
  assertApplyFlowDedicatedDevEnvironment,
} from "../db-target-guard";

/** @deprecated Production host — kept only for denylist tests/documentation. */
export const APPLYFLOW_DEDICATED_DEV_SUPABASE_HOST = APPLYFLOW_PRODUCTION_SUPABASE_HOST;
/** @deprecated Production pooler host — never an allowlisted destructive target. */
export const APPLYFLOW_DEDICATED_DEV_DB_HOST = "aws-0-sa-east-1.pooler.supabase.com";

export {
  APPLYFLOW_PRODUCTION_SUPABASE_HOST,
  APPLYFLOW_PRODUCTION_SUPABASE_PROJECT_REF,
  assertApplyFlowDestructiveDbTargetAllowed,
  classifyApplyFlowDbTarget,
  assertApplyFlowDedicatedDevEnvironment,
};
export type { ApplyFlowDbTargetClassification, ApplyFlowDevEnvironmentReport };

export function loadApplyFlowEnvLocalIfPresent(): void {
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
        // Prefer .env.local over inherited shell/user env so Production URLs cannot leak in.
        process.env[key] = value;
      }
      return;
    } catch {
      // try next candidate
    }
  }
}

/**
 * Loads .env.local (if present) then asserts the DB target is safe for destructive F3.5 work.
 * Production / Supabase remotes / unknown remotes fail closed before any mutation.
 */
export function assertApplyFlowF35DestructiveEnvironment(): ApplyFlowDbTargetClassification {
  loadApplyFlowEnvLocalIfPresent();
  return assertApplyFlowDestructiveDbTargetAllowed();
}
