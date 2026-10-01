/**
 * Fail-closed gate for ApplyFlow E2E-only capabilities
 * (auth bypass, provider fixtures, session routes).
 *
 * NEVER active on real Vercel production.
 * NEVER active on real Vercel preview (VERCEL=1).
 * Local/CI may set VERCEL_ENV=preview to simulate shared TheirStack policy
 * while still allowing fixtures when VERCEL is unset.
 */

export type ApplyFlowE2EEnv = {
  APPLYFLOW_E2E?: string;
  APPLYFLOW_E2E_SECRET?: string;
  APPLYFLOW_E2E_PROVIDER_FIXTURES?: string;
  APPLYFLOW_E2E_ALLOW_NODE_PRODUCTION?: string;
  VERCEL?: string;
  VERCEL_ENV?: string;
  NODE_ENV?: string;
};

export function isApplyFlowE2EFlagOn(env: ApplyFlowE2EEnv = process.env): boolean {
  return env.APPLYFLOW_E2E?.trim() === "1";
}

/**
 * Whether E2E-only server capabilities may run in this process.
 */
export function isApplyFlowE2ERuntimeAllowed(env: ApplyFlowE2EEnv = process.env): boolean {
  if (!isApplyFlowE2EFlagOn(env)) return false;
  if (!env.APPLYFLOW_E2E_SECRET?.trim()) return false;

  // Real Vercel Production — always refuse.
  if (env.VERCEL_ENV === "production") return false;

  // Real Vercel Preview / Production platform — refuse (no accidental cloud bypass).
  if (env.VERCEL === "1") return false;

  // `next start` sets NODE_ENV=production locally; require explicit opt-in.
  if (env.NODE_ENV === "production" && env.APPLYFLOW_E2E_ALLOW_NODE_PRODUCTION !== "1") {
    return false;
  }

  return true;
}

export function isApplyFlowE2EProviderFixturesEnabled(env: ApplyFlowE2EEnv = process.env): boolean {
  if (!isApplyFlowE2ERuntimeAllowed(env)) return false;
  return env.APPLYFLOW_E2E_PROVIDER_FIXTURES?.trim() === "1";
}

export function assertE2ESecretMatches(
  provided: string | null | undefined,
  env: ApplyFlowE2EEnv = process.env,
): boolean {
  if (!isApplyFlowE2ERuntimeAllowed(env)) return false;
  const expected = env.APPLYFLOW_E2E_SECRET?.trim() ?? "";
  const actual = provided?.trim() ?? "";
  if (!expected || !actual) return false;
  if (expected.length !== actual.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i += 1) {
    mismatch |= expected.charCodeAt(i) ^ actual.charCodeAt(i);
  }
  return mismatch === 0;
}
