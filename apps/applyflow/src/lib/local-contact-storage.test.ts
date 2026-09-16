import { afterEach, describe, expect, it, vi } from "vitest";

import type { Contact } from "@devflow/applyflow-core";

import {
  APPLYFLOW_DASHBOARD_CONTACTS_STORAGE_KEY,
  clearPersistedDashboardContacts,
  loadDashboardContacts,
  persistDashboardContacts,
} from "./local-contact-storage.js";

const contact: Contact = {
  id: "c1",
  name: "Jordan Manager",
  type: "engineering_manager",
  status: "not_contacted",
  createdAt: "2026-09-09T12:00:00.000Z",
  updatedAt: "2026-09-09T12:00:00.000Z",
};

function stubStorage(initial?: Record<string, string>) {
  const storage: Record<string, string> = { ...initial };
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
  return storage;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("local-contact-storage", () => {
  it("persiste contacts e interactions localmente", () => {
    const storage = stubStorage();
    persistDashboardContacts([contact], []);
    const loaded = loadDashboardContacts();
    expect(loaded.status).toBe("ok");
    expect(loaded.contacts).toHaveLength(1);
    expect(loaded.contacts[0]?.name).toBe("Jordan Manager");
    expect(storage[APPLYFLOW_DASHBOARD_CONTACTS_STORAGE_KEY]).toBeDefined();
  });

  it("clear remove a chave local", () => {
    const storage = stubStorage();
    persistDashboardContacts([contact], []);
    clearPersistedDashboardContacts();
    expect(storage[APPLYFLOW_DASHBOARD_CONTACTS_STORAGE_KEY]).toBeUndefined();
    expect(loadDashboardContacts().status).toBe("empty");
  });
});
