import { isApplyFlowPersistenceV2Enabled, type ApplyFlowPersistenceEnv } from "./feature-flag";

export type ApplyFlowSupabasePublicConfig = {
  url: string;
  /** Public publishable key (`sb_publishable_...`). Never a secret/service_role key. */
  publishableKey: string;
};

export type ApplyFlowPersistenceConfig = {
  enabled: boolean;
  supabaseConfigured: boolean;
  databaseConfigured: boolean;
  readyForFoundation: boolean;
  missing: string[];
};

function resolveSupabasePublishableKey(env: ApplyFlowPersistenceEnv): string | undefined {
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return typeof key === "string" && key.length > 0 ? key : undefined;
}

export function resolveApplyFlowSupabasePublicConfig(
  env: ApplyFlowPersistenceEnv = process.env,
): ApplyFlowSupabasePublicConfig | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = resolveSupabasePublishableKey(env);
  if (!url || !publishableKey) return null;
  return { url, publishableKey };
}

export function isApplyFlowDatabaseConfigured(env: ApplyFlowPersistenceEnv = process.env): boolean {
  return typeof env.DATABASE_URL === "string" && env.DATABASE_URL.length > 0;
}

/**
 * When Persistence V2 is OFF, this always reports enabled=false and does not block Gate A.
 * When ON, lists missing server-side configuration (no secret values).
 */
export function resolveApplyFlowPersistenceConfig(
  env: ApplyFlowPersistenceEnv = process.env,
): ApplyFlowPersistenceConfig {
  const enabled = isApplyFlowPersistenceV2Enabled(env);
  if (!enabled) {
    return {
      enabled: false,
      supabaseConfigured: false,
      databaseConfigured: isApplyFlowDatabaseConfigured(env),
      readyForFoundation: false,
      missing: [],
    };
  }

  const missing: string[] = [];
  if (!resolveApplyFlowSupabasePublicConfig(env)) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }
  if (!isApplyFlowDatabaseConfigured(env)) {
    missing.push("DATABASE_URL");
  }

  const supabaseConfigured = resolveApplyFlowSupabasePublicConfig(env) != null;
  const databaseConfigured = isApplyFlowDatabaseConfigured(env);

  return {
    enabled: true,
    supabaseConfigured,
    databaseConfigured,
    readyForFoundation: missing.length === 0,
    missing: [...new Set(missing)],
  };
}
