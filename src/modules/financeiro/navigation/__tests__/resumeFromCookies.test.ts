import { describe, expect, it } from "vitest";
import { FINANCEIRO_DASHBOARD_PATH, FINANCEIRO_LAST_ROUTE_COOKIE } from "../constants";
import { resolveFinanceiroResumeFromCookies } from "../resumeFromCookies";

function store(entries: Record<string, string>) {
  return {
    get(name: string) {
      const value = entries[name];
      return value !== undefined ? { value } : undefined;
    },
  };
}

describe("resolveFinanceiroResumeFromCookies", () => {
  it("usa dashboard quando cookie ausente", () => {
    const r = resolveFinanceiroResumeFromCookies(store({}));
    expect(r.targetPath).toBe(FINANCEIRO_DASHBOARD_PATH);
    expect(r.hasLastRoute).toBe(false);
  });

  it("restaura última rota válida e hasLastRoute true", () => {
    const path = "/ferramentas/financeiro/sources";
    const r = resolveFinanceiroResumeFromCookies(
      store({ [FINANCEIRO_LAST_ROUTE_COOKIE]: encodeURIComponent(path) })
    );
    expect(r.targetPath).toBe(path);
    expect(r.hasLastRoute).toBe(true);
  });

  it("hasLastRoute false quando cookie normaliza só para dashboard", () => {
    const r = resolveFinanceiroResumeFromCookies(
      store({
        [FINANCEIRO_LAST_ROUTE_COOKIE]: encodeURIComponent(
          "/ferramentas/financeiro/onboarding"
        ),
      })
    );
    expect(r.targetPath).toBe(FINANCEIRO_DASHBOARD_PATH);
    expect(r.hasLastRoute).toBe(false);
  });

  it("path fora do Financeiro cai no dashboard", () => {
    const r = resolveFinanceiroResumeFromCookies(
      store({
        [FINANCEIRO_LAST_ROUTE_COOKIE]: encodeURIComponent("/blog/post"),
      })
    );
    expect(r.targetPath).toBe(FINANCEIRO_DASHBOARD_PATH);
    expect(r.hasLastRoute).toBe(false);
  });
});
