import { describe, it, expect, vi, afterEach } from "vitest";
import { isDevFlowProspectingEnabled } from "../devflowProspecting";

describe("isDevFlowProspectingEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("retorna false para roles que não são platform_admin", () => {
    expect(isDevFlowProspectingEnabled("manager")).toBe(false);
    expect(isDevFlowProspectingEnabled("operator")).toBe(false);
    expect(isDevFlowProspectingEnabled(null)).toBe(false);
  });

  it("retorna true para platform_admin sem env definido", () => {
    vi.stubEnv("NEXT_PUBLIC_DEVFLOW_PROSPECTING_ENABLED", "");
    expect(isDevFlowProspectingEnabled("platform_admin")).toBe(true);
  });

  it("respeita kill-switch quando env é false", () => {
    vi.stubEnv("NEXT_PUBLIC_DEVFLOW_PROSPECTING_ENABLED", "false");
    expect(isDevFlowProspectingEnabled("platform_admin")).toBe(false);
  });

  it("permite platform_admin com env true", () => {
    vi.stubEnv("NEXT_PUBLIC_DEVFLOW_PROSPECTING_ENABLED", "true");
    expect(isDevFlowProspectingEnabled("platform_admin")).toBe(true);
  });
});
