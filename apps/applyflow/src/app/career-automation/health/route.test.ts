import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

function getHealth(probe = false) {
  const url = probe
    ? "http://localhost/career-automation/health?probe=true"
    : "http://localhost/career-automation/health";
  return GET(new Request(url) as never);
}

describe("GET /career-automation/health", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("reports a client-safe status for the default mock provider", async () => {
    vi.stubEnv("CAREER_AUTOMATION_ENABLED", "false");
    vi.stubEnv("CAREER_AUTOMATION_PROVIDER", "mock");
    const json = await (await getHealth()).json();

    expect(json).toEqual({
      enabled: false,
      provider: "mock",
      configured: true,
      reachable: null,
      timeoutMs: 10000,
    });
  });

  it("reports openclaw configured only when enabled with key and base url", async () => {
    vi.stubEnv("CAREER_AUTOMATION_ENABLED", "true");
    vi.stubEnv("CAREER_AUTOMATION_PROVIDER", "openclaw");
    vi.stubEnv("OPENCLAW_ENABLED", "true");
    vi.stubEnv("OPENCLAW_API_KEY", "secret");
    vi.stubEnv("OPENCLAW_BASE_URL", "https://openclaw.local");
    vi.stubEnv("OPENCLAW_TIMEOUT_MS", "10000");

    const json = await (await getHealth()).json();
    expect(json.provider).toBe("openclaw");
    expect(json.configured).toBe(true);
    expect(json.timeoutMs).toBe(10000);
    expect(json.reachable).toBeNull();
    expect(JSON.stringify(json)).not.toContain("secret");
    expect(JSON.stringify(json)).not.toContain("openclaw.local");
  });

  it("reports configured false when openclaw is selected but disabled", async () => {
    vi.stubEnv("CAREER_AUTOMATION_ENABLED", "true");
    vi.stubEnv("CAREER_AUTOMATION_PROVIDER", "openclaw");
    vi.stubEnv("OPENCLAW_ENABLED", "false");
    vi.stubEnv("OPENCLAW_API_KEY", "secret");
    vi.stubEnv("OPENCLAW_BASE_URL", "https://openclaw.local");

    const json = await (await getHealth()).json();
    expect(json.provider).toBe("openclaw");
    expect(json.configured).toBe(false);
  });

  it("probes reachability only when explicitly requested", async () => {
    vi.stubEnv("CAREER_AUTOMATION_ENABLED", "true");
    vi.stubEnv("CAREER_AUTOMATION_PROVIDER", "mock");

    const noProbe = await (await getHealth(false)).json();
    expect(noProbe.reachable).toBeNull();

    const probed = await (await getHealth(true)).json();
    expect(probed.reachable).toBe(true);
  });

  it("rejects POST with 405", async () => {
    const response = await POST();
    expect(response.status).toBe(405);
  });
});
