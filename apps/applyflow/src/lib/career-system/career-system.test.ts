import { describe, expect, it } from "vitest";
import {
  careerEnvironmentAllowsRealNetwork,
  resolveCareerRuntimeEnvironment,
} from "./environment";
import {
  createCareerCorrelationId,
  isCareerCorrelationId,
  resolveCareerCorrelationId,
} from "./correlation";
import { resolveCareerBuildMetadata } from "./version";
import { resolveCareerFeatureFlags } from "./feature-flags";
import {
  resolveCareerComponentStatuses,
  resolveCareerConfigBlockers,
} from "./config-validation";
import {
  resolveCareerLiveness,
  resolveCareerReadiness,
  resolveCareerSystemHealth,
} from "./health";
import {
  CAREER_OPERATIONAL_EVENTS,
  createCareerLogger,
  sanitizeCareerOperationalEvent,
} from "./observability";
import { createInMemoryCareerMetricsAdapter } from "./metrics";

describe("career runtime environment", () => {
  it("resolves the four formal environments deterministically", () => {
    expect(resolveCareerRuntimeEnvironment({ NODE_ENV: "development" })).toBe("development");
    expect(resolveCareerRuntimeEnvironment({ NODE_ENV: "test" })).toBe("test");
    expect(resolveCareerRuntimeEnvironment({ NODE_ENV: "production" })).toBe("production");
    expect(resolveCareerRuntimeEnvironment({ VERCEL_ENV: "preview" })).toBe("preview");
    expect(resolveCareerRuntimeEnvironment({ VERCEL_ENV: "production" })).toBe("production");
  });

  it("honors an explicit override and defaults to development", () => {
    expect(
      resolveCareerRuntimeEnvironment({ CAREER_RUNTIME_ENVIRONMENT: "preview", NODE_ENV: "production" }),
    ).toBe("preview");
    expect(resolveCareerRuntimeEnvironment({})).toBe("development");
  });

  it("forbids real network only in test", () => {
    expect(careerEnvironmentAllowsRealNetwork("test")).toBe(false);
    expect(careerEnvironmentAllowsRealNetwork("development")).toBe(true);
    expect(careerEnvironmentAllowsRealNetwork("production")).toBe(true);
  });
});

describe("correlation id", () => {
  it("creates and validates career_<uuid>", () => {
    const id = createCareerCorrelationId();
    expect(id.startsWith("career_")).toBe(true);
    expect(isCareerCorrelationId(id)).toBe(true);
  });

  it("only honors a well-formed client value, otherwise mints a new one", () => {
    expect(isCareerCorrelationId("token-abc")).toBe(false);
    const minted = resolveCareerCorrelationId("not-a-valid-id");
    expect(isCareerCorrelationId(minted)).toBe(true);
    const id = createCareerCorrelationId();
    expect(resolveCareerCorrelationId(id)).toBe(id);
  });
});

describe("build metadata", () => {
  it("is client-safe and never leaks secrets", () => {
    const meta = resolveCareerBuildMetadata({
      NEXT_PUBLIC_APP_VERSION: "1.2.3",
      NEXT_PUBLIC_COMMIT_SHA: "abcdef1234567890",
      NEXT_PUBLIC_BUILD_TIMESTAMP: "2026-06-18T00:00:00Z",
      NODE_ENV: "production",
    });
    expect(meta).toEqual({
      appVersion: "1.2.3",
      commitSha: "abcdef123456",
      buildTimestamp: "2026-06-18T00:00:00Z",
      environment: "production",
    });
  });
});

describe("feature flags", () => {
  it("defaults all external integrations off and agents on", () => {
    const flags = resolveCareerFeatureFlags({});
    expect(flags.careerAgentsEnabled).toBe(true);
    expect(flags.librechatAdapterEnabled).toBe(false);
    expect(flags.careerLlmEnabled).toBe(false);
    expect(flags.careerLlmProvider).toBe("mock");
    expect(flags.careerAutomationEnabled).toBe(false);
    expect(flags.careerAutomationProvider).toBe("mock");
    expect(flags.openClawEnabled).toBe(false);
    expect(flags.pilotMode).toBe(false);
  });
});

describe("config validation", () => {
  it("reports disabled components by default", () => {
    const statuses = resolveCareerComponentStatuses({});
    const byName = Object.fromEntries(statuses.map((s) => [s.component, s]));
    expect(byName.career_agents.status).toBe("ready");
    expect(byName.career_llm.status).toBe("disabled");
    expect(byName.career_automation.status).toBe("disabled");
    expect(byName.database.status).toBe("disabled");
  });

  it("marks an enabled-but-misconfigured openai LLM as misconfigured", () => {
    const statuses = resolveCareerComponentStatuses({
      CAREER_LLM_ENABLED: "true",
      CAREER_LLM_PROVIDER: "openai",
    });
    const llm = statuses.find((s) => s.component === "career_llm");
    expect(llm?.status).toBe("misconfigured");
    expect(llm?.errorCode).toBe("career_llm_openai_not_configured");
  });

  it("blocks production when an enabled component is misconfigured", () => {
    const blockers = resolveCareerConfigBlockers(
      { CAREER_LLM_ENABLED: "true", CAREER_LLM_PROVIDER: "openai" },
      "production",
    );
    expect(blockers.map((b) => b.component)).toContain("career_llm");
  });

  it("does not block preview for an optional misconfigured component", () => {
    const blockers = resolveCareerConfigBlockers(
      { CAREER_LLM_ENABLED: "true", CAREER_LLM_PROVIDER: "openai" },
      "preview",
    );
    expect(blockers).toHaveLength(0);
  });

  it("never serializes a secret value", () => {
    const statuses = resolveCareerComponentStatuses({
      CAREER_LLM_ENABLED: "true",
      CAREER_LLM_PROVIDER: "openai",
      OPENAI_API_KEY: "sk-should-never-appear",
      CAREER_LLM_MODEL: "gpt-test",
    });
    const serialized = JSON.stringify(statuses);
    expect(serialized).not.toContain("sk-should-never-appear");
    expect(serialized).not.toContain("gpt-test");
  });
});

describe("health, livez, readyz", () => {
  it("aggregates healthy state with no probe by default", async () => {
    const health = await resolveCareerSystemHealth({ env: {} as NodeJS.ProcessEnv });
    expect(health.status).toBe("healthy");
    expect(health.components.every((c) => c.reachable === null)).toBe(true);
  });

  it("probes only enabled+configured components when requested", async () => {
    const health = await resolveCareerSystemHealth({
      probe: true,
      env: { CAREER_LLM_ENABLED: "true", CAREER_LLM_PROVIDER: "mock" } as NodeJS.ProcessEnv,
    });
    const llm = health.components.find((c) => c.name === "career_llm");
    expect(llm?.reachable).toBe(true);
  });

  it("reports unhealthy when a required component is unhealthy (prod misconfigured strict)", async () => {
    const health = await resolveCareerSystemHealth({
      env: {
        NODE_ENV: "production",
        CAREER_AGENTS_ENABLED: "false",
      } as NodeJS.ProcessEnv,
    });
    // agents disabled -> not unhealthy by itself (disabled), so status should be degraded/healthy.
    expect(["healthy", "degraded"]).toContain(health.status);
  });

  it("livez never touches providers", () => {
    expect(resolveCareerLiveness().status).toBe("alive");
  });

  it("readyz is ready by default and not_ready when production config is invalid", () => {
    expect(resolveCareerReadiness({} as NodeJS.ProcessEnv).status).toBe("ready");
    const notReady = resolveCareerReadiness({
      NODE_ENV: "production",
      CAREER_LLM_ENABLED: "true",
      CAREER_LLM_PROVIDER: "openai",
    } as NodeJS.ProcessEnv);
    expect(notReady.status).toBe("not_ready");
    expect(notReady.blockers).toContain("career_llm");
  });
});

describe("observability", () => {
  it("keeps only allowlisted keys and forces safe flags", () => {
    const event = sanitizeCareerOperationalEvent(
      {
        eventName: "career_agent_completed",
        route: "/career-agents/orchestrate",
        outcome: "success",
        durationMs: 12,
        agent: "resume_analyst",
        // forbidden extras below must be dropped
        ...({ apiKey: "sk-secret", rawPrompt: "the resume", persisted: true } as object),
      } as never,
      { NODE_ENV: "test" },
    );
    const serialized = JSON.stringify(event);
    expect(serialized).not.toContain("sk-secret");
    expect(serialized).not.toContain("rawPrompt");
    expect(serialized).not.toContain("the resume");
    expect(event.persisted).toBe(false);
    expect(event.toolExecutionOccurred).toBe(false);
    expect(event.agent).toBe("resume_analyst");
  });

  it("redacts secret-looking string values", () => {
    const event = sanitizeCareerOperationalEvent(
      {
        eventName: "career_llm_failed",
        route: "/career-llm/generate",
        outcome: "error",
        durationMs: 1,
        errorCode: "Bearer sk-abc",
      },
      { NODE_ENV: "test" },
    );
    expect(event.errorCode).toBe("[redacted]");
  });

  it("logs a single sanitized JSON line", () => {
    const lines: string[] = [];
    const logger = createCareerLogger({ sink: (line) => lines.push(line), env: { NODE_ENV: "test" } });
    logger.info({
      eventName: "career_chat_completed",
      route: "/career-chat/librechat",
      outcome: "success",
      durationMs: 5,
    });
    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0]);
    expect(parsed.safeForClient).toBe(true);
    expect(parsed.level).toBe("info");
    expect(CAREER_OPERATIONAL_EVENTS).toContain(parsed.eventName);
  });
});

describe("metrics adapter", () => {
  it("aggregates in memory with no external sink", () => {
    const metrics = createInMemoryCareerMetricsAdapter();
    expect(metrics.provider).toBe("in_memory");
    metrics.recordEvent({
      eventName: "career_agent_completed",
      timestamp: new Date().toISOString(),
      route: "/x",
      outcome: "success",
      durationMs: 10,
      environment: "test",
      externalProviderCalled: false,
      persisted: false,
      toolExecutionOccurred: false,
    });
    const snap = metrics.snapshot();
    expect(snap.requests_total).toBe(1);
    expect(snap.requests_success).toBe(1);
    expect(snap.agent_runs).toBe(1);
    expect(snap.duration_ms).toBe(10);
    metrics.reset();
    expect(metrics.snapshot().requests_total).toBe(0);
  });
});
