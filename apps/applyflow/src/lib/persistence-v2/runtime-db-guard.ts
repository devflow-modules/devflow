import { classifyApplyFlowDbTarget, type ApplyFlowDbTargetEnv, type ApplyFlowDbTargetKind } from "./db-target-guard";

/**
 * Runtime gate for the app's Prisma client.
 *
 * `VERCEL` / `VERCEL_ENV` are set by the Vercel platform per deployment, not by requests.
 * Only Vercel Production may open the runtime database. Preview, Development and any Vercel
 * runtime without a recognised environment are denied regardless of the configured target:
 * no Preview database identity is registered, so no Preview target can be verified.
 * Off Vercel (local dev, CI) behaviour is unchanged.
 */
export type ApplyFlowRuntimeDbEnv = ApplyFlowDbTargetEnv & {
  VERCEL?: string;
  VERCEL_ENV?: string;
};

export type ApplyFlowRuntimeDbAccess =
  | { allowed: true; reason: "vercel_production" | "off_vercel" }
  | {
      allowed: false;
      reason: "vercel_non_production" | "vercel_environment_unrecognised";
      vercelEnv: string;
      targetKind: ApplyFlowDbTargetKind;
    };

export function resolveApplyFlowRuntimeDbAccess(
  env: ApplyFlowRuntimeDbEnv = process.env as ApplyFlowRuntimeDbEnv,
): ApplyFlowRuntimeDbAccess {
  const vercelEnv = env.VERCEL_ENV?.trim() ?? "";
  const onVercel = env.VERCEL === "1" || vercelEnv.length > 0;
  if (!onVercel) return { allowed: true, reason: "off_vercel" };
  if (vercelEnv === "production") return { allowed: true, reason: "vercel_production" };
  return {
    allowed: false,
    reason: vercelEnv === "preview" || vercelEnv === "development" ? "vercel_non_production" : "vercel_environment_unrecognised",
    vercelEnv: vercelEnv || "missing",
    targetKind: classifyApplyFlowDbTarget(env).kind,
  };
}

export class ApplyFlowRuntimeDbDeniedError extends Error {
  readonly code = "runtime_database_denied";

  constructor(access: Extract<ApplyFlowRuntimeDbAccess, { allowed: false }>) {
    super(`ApplyFlow runtime database is disabled (${access.reason}: ${access.vercelEnv}).`);
    this.name = "ApplyFlowRuntimeDbDeniedError";
  }
}

/**
 * Stand-in client for denied runtimes. Any database member access throws before a
 * PrismaClient (and its engine) is ever constructed.
 */
export function createDeniedApplyFlowPrisma<T extends object>(
  access: Extract<ApplyFlowRuntimeDbAccess, { allowed: false }>,
): T {
  return new Proxy({} as T, {
    get(_target, property) {
      if (typeof property !== "string" || property === "then" || property === "toJSON") return undefined;
      throw new ApplyFlowRuntimeDbDeniedError(access);
    },
  });
}
