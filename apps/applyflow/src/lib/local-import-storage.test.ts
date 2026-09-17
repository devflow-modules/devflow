import { describe, expect, it, vi } from "vitest";

import {
  APPLYFLOW_DASHBOARD_STORAGE_KEY,
  clearPersistedDashboardImport,
  loadDashboardImport,
  persistDashboardImport,
  upsertDashboardApplication,
} from "./local-import-storage.js";

describe("local-import-storage", () => {
  it("persiste e recarrega candidaturas", () => {
    const storage: Record<string, string> = {};
    const ls = {
      getItem: (k: string) => (k in storage ? storage[k]! : null),
      setItem: (k: string, v: string) => {
        storage[k] = v;
      },
      removeItem: (k: string) => {
        delete storage[k];
      },
    };
    vi.stubGlobal("window", { localStorage: ls } as Window & typeof globalThis);

    persistDashboardImport([
      {
        id: "1",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
        source: "linkedin",
        status: "applied",
      },
    ]);
    const loaded = loadDashboardImport();
    expect(loaded?.applications).toHaveLength(1);
    expect(loaded?.applications[0].id).toBe("1");

    clearPersistedDashboardImport();
    expect(storage[APPLYFLOW_DASHBOARD_STORAGE_KEY]).toBeUndefined();
  });

  it("upsert adiciona candidatura sem reutilizar job id como identidade estrutural", () => {
    const storage: Record<string, string> = {};
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => (k in storage ? storage[k]! : null),
        setItem: (k: string, v: string) => {
          storage[k] = v;
        },
        removeItem: (k: string) => {
          delete storage[k];
        },
      },
    } as Window & typeof globalThis);

    upsertDashboardApplication({
      id: "app-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
      source: "linkedin",
      status: "reviewing",
      jobUrl: "https://jobs.example/acme",
    });
    expect(loadDashboardImport()?.applications[0]?.id).toBe("app-1");
    expect(loadDashboardImport()?.applications[0]?.id).not.toBe("job-1");
  });
});
