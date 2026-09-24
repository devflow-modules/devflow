import { describe, expect, it, vi } from "vitest";

vi.mock("./db-health", () => ({
  probeApplyFlowDatabaseReachable: vi.fn(),
}));

import { resolveCareerReadiness, resolveCareerReadinessWithPersistence } from "../career-system/health";

describe("resolveCareerReadinessWithPersistence", () => {
  it("matches Gate A readiness when Persistence V2 is OFF", async () => {
    const base = resolveCareerReadiness({});
    const withPersistence = await resolveCareerReadinessWithPersistence({});
    expect(withPersistence.status).toBe(base.status);
    expect(withPersistence.environment).toBe(base.environment);
    expect(withPersistence.checks).toEqual(base.checks);
    expect(withPersistence.blockers).toEqual(base.blockers);
  });

  it("requires DB probe when Persistence V2 is ON", async () => {
    const { probeApplyFlowDatabaseReachable } = await import("./db-health");
    vi.mocked(probeApplyFlowDatabaseReachable).mockResolvedValue(false);

    const result = await resolveCareerReadinessWithPersistence({
      APPLYFLOW_PERSISTENCE_V2: "true",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
      DATABASE_URL: "postgresql://localhost:5432/applyflow",
    });

    expect(result.status).toBe("not_ready");
    expect(result.checks.databaseReachable).toBe(false);
    expect(result.blockers).toContain("database");
  });
});
