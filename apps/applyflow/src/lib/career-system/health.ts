import { probeCareerLlmReachable } from "../career-llm/career-llm-boundary";
import {
  resolveCareerComponentStatuses,
  resolveCareerConfigBlockers,
  type CareerComponentName,
  type CareerComponentStatus,
} from "./config-validation";
import {
  resolveCareerRuntimeEnvironment,
  type CareerRuntimeEnvironment,
} from "./environment";
import { resolveCareerBuildMetadata } from "./version";

export type CareerSystemHealthStatus = "healthy" | "degraded" | "unhealthy";
export type CareerComponentHealthStatus = "healthy" | "disabled" | "degraded" | "unhealthy";

export type CareerSystemHealthComponent = {
  name: CareerComponentName;
  enabled: boolean;
  configured: boolean;
  reachable: boolean | null;
  status: CareerComponentHealthStatus;
};

export type CareerSystemHealth = {
  status: CareerSystemHealthStatus;
  environment: CareerRuntimeEnvironment;
  version: string;
  timestamp: string;
  components: CareerSystemHealthComponent[];
};

const PROBE_TIMEOUT_MS = 5000;

function componentHealthStatus(component: CareerComponentStatus): CareerComponentHealthStatus {
  if (component.status === "disabled") {
    return "disabled";
  }
  if (component.status === "ready") {
    return "healthy";
  }
  // misconfigured
  return component.required ? "unhealthy" : "degraded";
}

function overallStatus(components: CareerSystemHealthComponent[]): CareerSystemHealthStatus {
  if (components.some((component) => component.status === "unhealthy")) {
    return "unhealthy";
  }
  if (
    components.some(
      (component) => component.status === "degraded" || component.reachable === false,
    )
  ) {
    return "degraded";
  }
  return "healthy";
}

async function withTimeout<T>(promise: Promise<T>, fallback: T, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

/**
 * Aggregates client-safe state from existing boundaries. By default it performs NO external
 * probe (`reachable` stays `null`); external reachability is only checked when `probe` is true.
 * It never generates tokens, runs tools, returns provider payloads, or persists anything.
 */
export async function resolveCareerSystemHealth(
  options: { probe?: boolean; env?: NodeJS.ProcessEnv } = {},
): Promise<CareerSystemHealth> {
  const env = options.env ?? process.env;
  const probe = options.probe === true;
  const environment = resolveCareerRuntimeEnvironment(env);
  const build = resolveCareerBuildMetadata(env);
  const statuses = resolveCareerComponentStatuses(env);

  const components: CareerSystemHealthComponent[] = [];
  for (const component of statuses) {
    let reachable: boolean | null = null;

    if (probe && component.enabled && component.configured) {
      if (component.component === "career_llm") {
        reachable = await withTimeout(
          probeCareerLlmReachable(env).catch(() => false),
          false,
          PROBE_TIMEOUT_MS,
        );
      } else {
        // Deterministic, in-process components are reachable when enabled+configured.
        reachable = true;
      }
    }

    components.push({
      name: component.component,
      enabled: component.enabled,
      configured: component.configured,
      reachable,
      status: componentHealthStatus(component),
    });
  }

  return {
    status: overallStatus(components),
    environment,
    version: build.appVersion,
    timestamp: new Date().toISOString(),
    components,
  };
}

export type CareerLivenessResult = {
  status: "alive";
  timestamp: string;
};

/**
 * Liveness only confirms the process responds. It never calls OpenAI, LibreChat, Nango,
 * Gmail, Calendar, tools, or any database query.
 */
export function resolveCareerLiveness(): CareerLivenessResult {
  return { status: "alive", timestamp: new Date().toISOString() };
}

export type CareerReadinessResult = {
  status: "ready" | "not_ready";
  environment: CareerRuntimeEnvironment;
  checks: {
    appInitialized: boolean;
    requiredConfigValid: boolean;
    databaseReachable: boolean | null;
    boundariesLoaded: boolean;
  };
  blockers: CareerComponentName[];
  timestamp: string;
};

/**
 * Readiness confirms the app initialized, required config is valid, internal boundaries are
 * loaded, and (when a database is configured) a minimal connectivity assumption holds. It does
 * NOT run generation, an agent, a tool, or an automation.
 */
export function resolveCareerReadiness(env: NodeJS.ProcessEnv = process.env): CareerReadinessResult {
  const environment = resolveCareerRuntimeEnvironment(env);
  const blockers = resolveCareerConfigBlockers(env, environment);
  const statuses = resolveCareerComponentStatuses(env);
  const database = statuses.find((c) => c.component === "database");

  // Boundaries are statically imported above; reaching this code means they loaded.
  const boundariesLoaded = true;
  const appInitialized = true;
  const requiredConfigValid = blockers.length === 0;
  const databaseReachable = database && database.enabled ? database.configured : null;

  const ready = appInitialized && requiredConfigValid && boundariesLoaded;

  return {
    status: ready ? "ready" : "not_ready",
    environment,
    checks: {
      appInitialized,
      requiredConfigValid,
      databaseReachable,
      boundariesLoaded,
    },
    blockers: blockers.map((component) => component.component),
    timestamp: new Date().toISOString(),
  };
}
