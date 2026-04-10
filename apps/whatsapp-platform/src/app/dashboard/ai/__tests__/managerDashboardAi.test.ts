import { describe, it, expect } from "vitest";
import { buildManagerActions, generateManagerInsights } from "../managerDashboardAi";

describe("buildManagerActions", () => {
  it("gera acção HIGH quando há highPending", () => {
    const actions = buildManagerActions(
      { highPending: 3, stalled: 0, negotiating: 0, reactivationQueued: 0 },
      { lead: 1, qualifying: 0, negotiating: 0, support: 0, closed: 0 }
    );
    expect(actions.some((a) => a.type === "high_no_response")).toBe(true);
    expect(actions.find((a) => a.type === "high_no_response")?.action).toBe(
      "/inbox?filter=high_no_response"
    );
  });

  it("gera stalled e reactivation quando contagens > 0", () => {
    const actions = buildManagerActions(
      { highPending: 0, stalled: 2, negotiating: 0, reactivationQueued: 5 },
      { lead: 0, qualifying: 0, negotiating: 0, support: 0, closed: 0 }
    );
    expect(actions.map((a) => a.type)).toEqual(["stalled", "reactivation"]);
  });

  it("retorna vazio sem oportunidades", () => {
    expect(buildManagerActions(null, null)).toEqual([]);
  });
});

describe("generateManagerInsights", () => {
  it("limita a 3 insights", () => {
    const lines = generateManagerInsights(
      {
        totalMessages: 100,
        autoReplies: 80,
        fallbacks: 3,
        errors: 2,
        blockedDecisions: 1,
        avgLatency: 100,
        periodDays: 30,
        automationPercent: 78,
        fallbackPercent: null,
        errorPercent: null,
      },
      { lead: 2, qualifying: 1, negotiating: 4, support: 0, closed: 0 },
      { highPending: 2, stalled: 1, negotiating: 3, reactivationQueued: 0 },
      { high: 5, medium: 2, low: 1, avgScore: 40 }
    );
    expect(lines.length).toBeLessThanOrEqual(3);
  });

  it("menciona automação quando há métricas", () => {
    const lines = generateManagerInsights(
      {
        totalMessages: 10,
        autoReplies: 8,
        fallbacks: 0,
        errors: 0,
        blockedDecisions: 0,
        avgLatency: 0,
        periodDays: 7,
        automationPercent: 80,
        fallbackPercent: null,
        errorPercent: null,
      },
      null,
      null,
      null
    );
    expect(lines.some((l) => l.includes("80%"))).toBe(true);
  });
});
