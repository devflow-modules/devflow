import { describe, expect, it } from "vitest";

import { parseApplyFlowApplicationsImport, parseApplyFlowImportJsonString } from "../imported-application-schema.js";

const validApp = {
  id: "1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
  status: "reviewing",
  source: "linkedin",
};

describe("parseApplyFlowApplicationsImport", () => {
  it("aceita array de registos", () => {
    const r = parseApplyFlowApplicationsImport([validApp]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.applications).toHaveLength(1);
    expect(r.applications[0].id).toBe("1");
    expect(r.ignoredCount).toBe(0);
  });

  it("aceita payload versionado", () => {
    const r = parseApplyFlowApplicationsImport({ version: 1, applications: [validApp] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.applications).toHaveLength(1);
  });

  it("ignora registos inválidos e mantém válidos", () => {
    const r = parseApplyFlowApplicationsImport([
      validApp,
      { id: "", status: "reviewing", createdAt: "x", updatedAt: "y" },
      { foo: 1 },
    ]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.applications).toHaveLength(1);
    expect(r.ignoredCount).toBe(2);
  });

  it("rejeita JSON raiz inválido", () => {
    const r = parseApplyFlowApplicationsImport({ foo: [] });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.length).toBeGreaterThan(3);
  });

  it("rejeita quando nada válido", () => {
    const r = parseApplyFlowApplicationsImport([{ id: "x" }]);
    expect(r.ok).toBe(false);
  });
});

describe("parseApplyFlowImportJsonString", () => {
  it("rejeita sintaxe inválida", () => {
    const r = parseApplyFlowImportJsonString("{");
    expect(r.ok).toBe(false);
  });

  it("parse string válida", () => {
    const r = parseApplyFlowImportJsonString(JSON.stringify([validApp]));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.applications).toHaveLength(1);
  });
});
