/**
 * TheirStack cost-control gate (Phase 9B).
 *
 * There is no shared/distributed rate-limit infrastructure in this monorepo
 * (no Redis/KV/Upstash). Process-local Maps are NOT production-safe under
 * multi-instance Vercel. Therefore TheirStack stays disabled on shared
 * deployments unless explicitly opted in for single-tenant personal use.
 *
 * APPLYFLOW_THEIRSTACK_ENABLED=true acknowledges that process-local quota
 * is best-effort only and must not be treated as multi-user cost safety.
 */

export type TheirStackAccessEnv = {
  APPLYFLOW_THEIRSTACK_ENABLED?: string;
  THEIRSTACK_API_KEY?: string;
  VERCEL_ENV?: string;
  NODE_ENV?: string;
};

export function isSharedApplyFlowDeployment(env: TheirStackAccessEnv = process.env): boolean {
  const vercel = env.VERCEL_ENV?.trim();
  if (vercel === "production" || vercel === "preview") return true;
  return env.NODE_ENV === "production" && Boolean(vercel);
}

/**
 * Whether paid TheirStack search is allowed at all for this runtime.
 * Default: OFF on Vercel production/preview and NODE_ENV=production.
 * Local/personal DX: ON when API key is present and not on a shared deploy,
 * unless APPLYFLOW_THEIRSTACK_ENABLED explicitly forces on/off.
 */
export function isTheirStackSearchEnabled(env: TheirStackAccessEnv = process.env): boolean {
  const forced = env.APPLYFLOW_THEIRSTACK_ENABLED?.trim().toLowerCase();
  if (forced === "false" || forced === "0") return false;
  if (forced === "true" || forced === "1") {
    return Boolean(env.THEIRSTACK_API_KEY?.trim());
  }
  if (isSharedApplyFlowDeployment(env)) return false;
  return Boolean(env.THEIRSTACK_API_KEY?.trim());
}
