import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  applyDashboardTableFilters,
  parseApplyFlowImportJsonString,
  type DashboardTableFilters,
} from "@devflow/applyflow-core";
import { describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const demoJsonPath = path.join(__dirname, "../../public/demo/applications-demo.json");

const baseFilters: DashboardTableFilters = {
  period: "all",
  status: "all",
  skill: "",
  workModel: "all",
  contractType: "all",
  englishRequired: "all",
};

describe("applications-demo.json", () => {
  it("é parseável por parseApplyFlowImportJsonString sem registos ignorados", () => {
    const text = readFileSync(demoJsonPath, "utf8");
    const r = parseApplyFlowImportJsonString(text);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.applications.length).toBeGreaterThanOrEqual(15);
    expect(r.applications.length).toBeLessThanOrEqual(25);
    expect(r.ignoredCount).toBe(0);
  });

  it("filtros por estado continuam aplicáveis ao dataset demo", () => {
    const text = readFileSync(demoJsonPath, "utf8");
    const r = parseApplyFlowImportJsonString(text);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const ref = new Date("2026-05-07T12:00:00.000Z");
    const interview = applyDashboardTableFilters(
      r.applications,
      { ...baseFilters, status: "interview" },
      ref,
    );
    expect(interview.length).toBeGreaterThan(0);
    expect(interview.every((a) => a.status === "interview")).toBe(true);

    const withReact = applyDashboardTableFilters(
      r.applications,
      { ...baseFilters, skill: "React" },
      ref,
    );
    expect(withReact.length).toBeGreaterThan(0);
  });
});
