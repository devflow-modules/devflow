/**
 * Fail-closed Stripe runtime policy.
 *
 * NODE_ENV must never authorize Live financial operations.
 * Live is allowed only on verified Vercel Production (VERCEL=1 + VERCEL_ENV=production).
 * Local/CI may use explicit Test keys (sk_test_ / rk_test_) only.
 */

export const STRIPE_UNAVAILABLE_IN_ENVIRONMENT = "stripe_unavailable_in_environment" as const;

export type StripeKeyMode = "live" | "test" | "unknown";

/** Explicit env slice — avoid assigning NodeJS.ProcessEnv directly under exactOptionalPropertyTypes. */
export type StripeEnvSnapshot = {
  VERCEL?: string | undefined;
  VERCEL_ENV?: string | undefined;
};

export type StripeRuntimeDecision =
  | { allowed: true; deployment: "vercel_production" | "local_test" }
  | {
      allowed: false;
      code: typeof STRIPE_UNAVAILABLE_IN_ENVIRONMENT;
      deployment: "vercel_preview" | "vercel_development" | "vercel_unknown" | "local_live_blocked";
    };

export class StripeEnvironmentDeniedError extends Error {
  readonly code = STRIPE_UNAVAILABLE_IN_ENVIRONMENT;

  constructor(message = "Stripe is unavailable in this environment") {
    super(message);
    this.name = "StripeEnvironmentDeniedError";
  }
}

export function isStripeEnvironmentDeniedError(
  err: unknown
): err is StripeEnvironmentDeniedError {
  return (
    err instanceof StripeEnvironmentDeniedError ||
    (typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: unknown }).code === STRIPE_UNAVAILABLE_IN_ENVIRONMENT)
  );
}

function readStripeEnv(env?: StripeEnvSnapshot): StripeEnvSnapshot {
  const source = env ?? {
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
  };
  return {
    VERCEL: source.VERCEL,
    VERCEL_ENV: source.VERCEL_ENV,
  };
}

export function classifyStripeSecretKey(secretKey: string): StripeKeyMode {
  const key = secretKey.trim();
  if (key.startsWith("sk_live_") || key.startsWith("rk_live_")) return "live";
  if (key.startsWith("sk_test_") || key.startsWith("rk_test_")) return "test";
  return "unknown";
}

export function isVerifiedVercelProduction(env?: StripeEnvSnapshot): boolean {
  const { VERCEL, VERCEL_ENV } = readStripeEnv(env);
  return VERCEL === "1" && VERCEL_ENV === "production";
}

/**
 * Any hosted/non-exact-production Vercel signal → treat as non-production host.
 * Includes preview, development, missing/malformed VERCEL_ENV, and VERCEL_ENV=production without VERCEL=1.
 */
export function isNonProductionHostedDeployment(env?: StripeEnvSnapshot): boolean {
  if (isVerifiedVercelProduction(env)) return false;

  const { VERCEL, VERCEL_ENV } = readStripeEnv(env);
  const vercelEnv = VERCEL_ENV?.trim() ?? "";
  if (VERCEL === "1") return true;
  if (vercelEnv.length > 0) return true;
  return false;
}

export function evaluateStripeRuntimeAccess(
  env: StripeEnvSnapshot | undefined,
  keyMode: StripeKeyMode
): StripeRuntimeDecision {
  if (isVerifiedVercelProduction(env)) {
    return { allowed: true, deployment: "vercel_production" };
  }

  if (isNonProductionHostedDeployment(env)) {
    const vercelEnv = readStripeEnv(env).VERCEL_ENV?.trim() ?? "";
    const deployment =
      vercelEnv === "preview"
        ? ("vercel_preview" as const)
        : vercelEnv === "development"
          ? ("vercel_development" as const)
          : ("vercel_unknown" as const);
    return {
      allowed: false,
      code: STRIPE_UNAVAILABLE_IN_ENVIRONMENT,
      deployment,
    };
  }

  if (keyMode === "test") {
    return { allowed: true, deployment: "local_test" };
  }

  return {
    allowed: false,
    code: STRIPE_UNAVAILABLE_IN_ENVIRONMENT,
    deployment: "local_live_blocked",
  };
}

/** Authorize use of a Stripe API secret before constructing the SDK / calling the API. */
export function assertStripeSecretKeyAllowed(
  secretKey: string,
  env?: StripeEnvSnapshot
): void {
  const decision = evaluateStripeRuntimeAccess(env, classifyStripeSecretKey(secretKey));
  if (!decision.allowed) {
    throw new StripeEnvironmentDeniedError();
  }
}

/**
 * Webhook signing secrets are not sk_live_/sk_test_; authorize by deployment identity.
 * Local/CI without Vercel markers may process webhooks (Stripe CLI / test endpoint).
 * Vercel Preview/Development/unknown must not mutate billing state.
 */
export function assertStripeWebhookProcessingAllowed(env?: StripeEnvSnapshot): void {
  if (isVerifiedVercelProduction(env)) return;
  if (isNonProductionHostedDeployment(env)) {
    throw new StripeEnvironmentDeniedError();
  }
}

export function isStripeWebhookProcessingAllowed(env?: StripeEnvSnapshot): boolean {
  try {
    assertStripeWebhookProcessingAllowed(env);
    return true;
  } catch {
    return false;
  }
}

export function isStripeSecretKeyAllowed(
  secretKey: string,
  env?: StripeEnvSnapshot
): boolean {
  return evaluateStripeRuntimeAccess(env, classifyStripeSecretKey(secretKey)).allowed;
}
