import { describe, expect, it } from "vitest";
import { gustavoProfile } from "../candidate-profile.js";
import { getSalarySuggestion } from "../salary-rules.js";
import type { CandidateProfile } from "../profile-schema.js";

describe("getSalarySuggestion", () => {
  it("CLT pleno usa texto do perfil", () => {
    const r = getSalarySuggestion({ kind: "clt_pleno" });
    expect(r.display).toContain("10.000");
    expect(r.display).toContain("CLT");
  });

  it("CLT senior usa texto do perfil", () => {
    const r = getSalarySuggestion({ kind: "clt_senior" });
    expect(r.display).toContain("14.500");
    expect(r.display).toContain("CLT");
  });

  it("PJ senior usa texto do perfil", () => {
    const r = getSalarySuggestion({ kind: "pj_senior" });
    expect(r.display).toContain("17.500");
    expect(r.display).toContain("PJ");
  });

  it("USD mensal", () => {
    const r = getSalarySuggestion({ kind: "usd_monthly" });
    expect(r.display).toContain("4,500");
    expect(r.warning).toBeDefined();
  });

  it("USD hourly", () => {
    const r = getSalarySuggestion({ kind: "usd_hourly" });
    expect(r.display.toLowerCase()).toContain("hour");
  });

  it("genérico retorna baixa confiança", () => {
    const r = getSalarySuggestion({ kind: "generic" });
    expect(r.confidence).toBe("low");
    expect(r.warning).toBeDefined();
  });

  it("perfil customizado altera display", () => {
    const custom: CandidateProfile = {
      ...gustavoProfile,
      salary: {
        ...gustavoProfile.salary,
        usdMonthly: "USD 9.999/month",
      },
    };
    expect(getSalarySuggestion({ kind: "usd_monthly" }, custom).display).toContain("9.999");
  });
});
