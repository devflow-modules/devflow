import type { CareerRuntimeEnvironment, CareerRuntimeEnv } from "./environment";
import { resolveCareerRuntimeEnvironment } from "./environment";

/**
 * Client-safe build metadata. Only non-sensitive identifiers are exposed: app version, a
 * short commit sha, a build timestamp, and the resolved environment. No secrets, internal
 * URLs, or provider ids.
 */
export type CareerBuildMetadata = {
  appVersion: string;
  commitSha: string;
  buildTimestamp: string;
  environment: CareerRuntimeEnvironment;
};

type CareerBuildEnv = {
  [key: string]: string | undefined;
  VERCEL_GIT_COMMIT_SHA?: string;
  NEXT_PUBLIC_APP_VERSION?: string;
  NEXT_PUBLIC_COMMIT_SHA?: string;
  NEXT_PUBLIC_BUILD_TIMESTAMP?: string;
} & CareerRuntimeEnv;

const UNKNOWN = "unknown";

function shortenSha(value: string | undefined): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    return UNKNOWN;
  }
  return value.trim().slice(0, 12);
}

function resolveCommitSha(env: CareerBuildEnv): string {
  return shortenSha(env.VERCEL_GIT_COMMIT_SHA ?? env.NEXT_PUBLIC_COMMIT_SHA);
}

export function resolveCareerBuildMetadata(
  env: CareerBuildEnv = process.env,
): CareerBuildMetadata {
  return {
    appVersion:
      typeof env.NEXT_PUBLIC_APP_VERSION === "string" && env.NEXT_PUBLIC_APP_VERSION.trim().length > 0
        ? env.NEXT_PUBLIC_APP_VERSION.trim()
        : "0.1.0",
    commitSha: resolveCommitSha(env),
    buildTimestamp:
      typeof env.NEXT_PUBLIC_BUILD_TIMESTAMP === "string" &&
      env.NEXT_PUBLIC_BUILD_TIMESTAMP.trim().length > 0
        ? env.NEXT_PUBLIC_BUILD_TIMESTAMP.trim()
        : UNKNOWN,
    environment: resolveCareerRuntimeEnvironment(env),
  };
}
