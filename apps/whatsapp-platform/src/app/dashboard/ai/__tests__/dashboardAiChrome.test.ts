import { describe, it, expect } from "vitest";
import {
  DASHBOARD_AI_DESCRIPTION,
  DASHBOARD_AI_HEADER_QUICK_LINKS,
  DASHBOARD_AI_HEALTH_DETAILS_SUMMARY,
  DASHBOARD_AI_MAX_HEADER_QUICK_LINKS,
  DASHBOARD_AI_TITLE,
} from "../dashboardAiChrome";

describe("dashboardAiChrome (dashboard-ai F1)", () => {
  it("título e descrição curtos", () => {
    expect(DASHBOARD_AI_TITLE.length).toBeLessThanOrEqual(24);
    expect(DASHBOARD_AI_DESCRIPTION.length).toBeLessThanOrEqual(120);
    expect(DASHBOARD_AI_DESCRIPTION).not.toMatch(/webhook|filas|funil/i);
  });

  it("exactamente ≤2 quickActions e sem Inbox", () => {
    expect(DASHBOARD_AI_HEADER_QUICK_LINKS).toHaveLength(DASHBOARD_AI_MAX_HEADER_QUICK_LINKS);
    expect(DASHBOARD_AI_HEADER_QUICK_LINKS.length).toBeLessThanOrEqual(2);
    const hrefs = DASHBOARD_AI_HEADER_QUICK_LINKS.map((l) => l.href);
    expect(hrefs).not.toContain("/inbox");
    expect(hrefs.every((h) => !h.startsWith("/inbox"))).toBe(true);
  });

  it("atalhos apontam para configuração de IA, não motor/billing", () => {
    const hrefs = DASHBOARD_AI_HEADER_QUICK_LINKS.map((l) => l.href);
    expect(hrefs).toContain("/settings/ai");
    expect(hrefs).toContain("/settings/ai-analytics");
    expect(hrefs).not.toContain("/settings");
    expect(hrefs).not.toContain("/dashboard/billing");
  });

  it("summary dos detalhes de saúde está definido", () => {
    expect(DASHBOARD_AI_HEALTH_DETAILS_SUMMARY).toMatch(/canal|controlos/i);
  });
});
