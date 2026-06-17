import { describe, expect, it } from "vitest";
import {
  containsForbiddenCareerAgentKey,
  isCareerAgentContextSafe,
  scanCareerAgentPayloadForForbiddenKeys,
} from "../security.js";
import { isCareerAgentCapabilityAllowed } from "../capability-resolution.js";
import { CAREER_AGENT_FORBIDDEN_CAPABILITIES } from "../capabilities.js";

describe("career agent security", () => {
  it("detects forbidden keys", () => {
    expect(containsForbiddenCareerAgentKey("access_token")).toBe(true);
    expect(containsForbiddenCareerAgentKey("company")).toBe(false);
  });

  it("rejects unsafe context flags", () => {
    expect(isCareerAgentContextSafe({ hasToken: true })).toBe(false);
    expect(isCareerAgentContextSafe({ rawProviderData: true })).toBe(false);
    expect(isCareerAgentContextSafe({ sanitized: true, hasToken: false, rawProviderData: false })).toBe(true);
  });

  it("does not allow forbidden capabilities for any agent", () => {
    for (const capability of CAREER_AGENT_FORBIDDEN_CAPABILITIES) {
      expect(isCareerAgentCapabilityAllowed("application_analyst", capability)).toBe(false);
    }
  });

  it("scans nested payloads for forbidden keys", () => {
    const hits = scanCareerAgentPayloadForForbiddenKeys({
      context: {
        connectionId: "abc",
      },
    });

    expect(hits).toContain("context.connectionId");
  });
});
