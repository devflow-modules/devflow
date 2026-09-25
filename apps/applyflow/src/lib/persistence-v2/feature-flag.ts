export type ApplyFlowPersistenceEnv = {
  APPLYFLOW_PERSISTENCE_V2?: string;
  [key: string]: string | undefined;
};

/**
 * Persistence V2 is opt-in. Default OFF preserves local-first V1 (Gate A).
 */
export function isApplyFlowPersistenceV2Enabled(
  env: ApplyFlowPersistenceEnv = process.env,
): boolean {
  return env.APPLYFLOW_PERSISTENCE_V2 === "true";
}
