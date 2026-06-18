/**
 * Career Suite runtime environment matrix.
 *
 * Server-side only. Resolves a formal environment used by config validation, health checks,
 * and observability. The rules are intentionally conservative:
 *
 * - `development` may use deterministic mocks freely.
 * - `test` must never reach a real network (enforced by callers via `allowsRealNetwork`).
 * - `preview` only contacts external providers when their explicit flags are on.
 * - `production` fails safe when a feature is enabled but misconfigured.
 *
 * No external flag turns a real provider on automatically, and there is never a silent
 * fallback from a real provider to a mock — an enabled-but-misconfigured feature is reported
 * as `misconfigured`, never partially started.
 */
export const CAREER_RUNTIME_ENVIRONMENTS = [
  "development",
  "test",
  "preview",
  "production",
] as const;

export type CareerRuntimeEnvironment = (typeof CAREER_RUNTIME_ENVIRONMENTS)[number];

export type CareerRuntimeEnv = {
  [key: string]: string | undefined;
  NODE_ENV?: string;
  VERCEL_ENV?: string;
  CAREER_RUNTIME_ENVIRONMENT?: string;
};

function isCareerRuntimeEnvironment(value: string | undefined): value is CareerRuntimeEnvironment {
  return (
    typeof value === "string" &&
    (CAREER_RUNTIME_ENVIRONMENTS as readonly string[]).includes(value)
  );
}

/**
 * Resolves the formal Career Suite environment.
 *
 * Precedence: explicit `CAREER_RUNTIME_ENVIRONMENT` override → Vercel `VERCEL_ENV`
 * (`production` | `preview` | `development`) → Node `NODE_ENV` (`test` | `production` →
 * mapped, anything else → `development`). Defaults to `development`.
 */
export function resolveCareerRuntimeEnvironment(
  env: CareerRuntimeEnv = process.env,
): CareerRuntimeEnvironment {
  if (isCareerRuntimeEnvironment(env.CAREER_RUNTIME_ENVIRONMENT)) {
    return env.CAREER_RUNTIME_ENVIRONMENT;
  }

  const vercelEnv = env.VERCEL_ENV;
  if (vercelEnv === "production") {
    return "production";
  }
  if (vercelEnv === "preview") {
    return "preview";
  }

  if (env.NODE_ENV === "test") {
    return "test";
  }
  if (env.NODE_ENV === "production") {
    return "production";
  }

  return "development";
}

/**
 * `test` is the only environment that must never reach a real network. Real provider calls
 * are additionally gated by each feature's explicit flag and configuration.
 */
export function careerEnvironmentAllowsRealNetwork(environment: CareerRuntimeEnvironment): boolean {
  return environment !== "test";
}

/**
 * In production a feature that is enabled but missing required config must fail explicitly
 * rather than starting partially.
 */
export function careerEnvironmentRequiresStrictConfig(
  environment: CareerRuntimeEnvironment,
): boolean {
  return environment === "production";
}
