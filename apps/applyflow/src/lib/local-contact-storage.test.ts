import { afterEach, describe, expect, it, vi } from "vitest";

import type { Contact } from "@devflow/applyflow-core";

import {
  APPLYFLOW_DASHBOARD_CONTACTS_STORAGE_KEY,
  archiveDashboardOutreach,
  clearPersistedDashboardContacts,
  loadApplicationOutreach,
  loadDashboardContacts,
  persistDashboardContacts,
  saveDashboardOutreach,
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

  it("cria contacto associado à candidatura", () => {
    stubStorage();
    const scoped = {
      ...contact,
      applicationId: "application-a",
      jobId: "job-a",
      status: "IDENTIFIED" as const,
      channel: "linkedin" as const,
      language: "EN" as const,
    };
    expect(
      saveDashboardOutreach(
        { applicationId: "application-a", jobId: "job-a" },
        scoped,
      ).ok,
    ).toBe(true);
    expect(loadApplicationOutreach({ applicationId: "application-a", jobId: "job-a" }).contacts).toEqual([scoped]);
  });

  it("impede alteração de contacto pertencente a outra candidatura", () => {
    stubStorage();
    const original = {
      ...contact,
      applicationId: "application-a",
      jobId: "job-a",
      status: "IDENTIFIED" as const,
    };
    persistDashboardContacts([original], []);
    const result = saveDashboardOutreach(
      { applicationId: "application-b", jobId: "job-b" },
      { ...original, applicationId: "application-b", jobId: "job-b", notes: "cross-scope" },
    );
    expect(result).toEqual({ ok: false, error: "outreach_scope_mismatch" });
    expect(loadDashboardContacts().contacts[0]?.notes).toBeUndefined();
  });

  it("edita e arquiva contacto dentro da mesma candidatura", () => {
    stubStorage();
    const scope = { applicationId: "application-a", jobId: "job-a" };
    const original = {
      ...contact,
      applicationId: scope.applicationId,
      jobId: scope.jobId,
      status: "IDENTIFIED" as const,
    };
    persistDashboardContacts([original], []);
    expect(saveDashboardOutreach(scope, { ...original, notes: "Updated" }).ok).toBe(true);
    expect(loadApplicationOutreach(scope).contacts[0]?.notes).toBe("Updated");
    expect(archiveDashboardOutreach(scope, original.id, new Date("2026-09-23T12:00:00.000Z")).ok).toBe(true);
    expect(loadApplicationOutreach(scope).contacts).toHaveLength(0);
    expect(loadDashboardContacts().contacts[0]?.archivedAt).toBe("2026-09-23T12:00:00.000Z");
  });

  it("normaliza crédito InMail omitido e rejeita combinações inválidas", () => {
    stubStorage();
    const scope = { applicationId: "application-a", jobId: "job-a" };
    const inMail = {
      ...contact,
      applicationId: scope.applicationId,
      jobId: scope.jobId,
      status: "SENT" as const,
      sentAt: "2026-09-23T12:00:00.000Z",
      channel: "linkedin_inmail" as const,
      inMailCreditConsumed: true,
    };

    expect(saveDashboardOutreach(scope, inMail).ok).toBe(true);
    expect(loadDashboardContacts().contacts[0]?.inMailCredits).toBe(1);
    expect(
      saveDashboardOutreach(scope, {
        ...inMail,
        id: "zero",
        inMailCredits: 0,
      }).ok,
    ).toBe(true);
    expect(loadDashboardContacts().contacts.find((item) => item.id === "zero")?.inMailCredits).toBe(1);

    expect(
      saveDashboardOutreach(scope, {
        ...inMail,
        id: "negative",
        inMailCredits: -1,
      }),
    ).toEqual({ ok: false, error: "invalid_outreach" });
    expect(
      saveDashboardOutreach(scope, {
        ...inMail,
        id: "wrong-channel",
        channel: "linkedin",
      }),
    ).toEqual({ ok: false, error: "invalid_outreach" });
  });

  it("rejeita timestamps e estados V1 inconsistentes", () => {
    stubStorage();
    const scope = { applicationId: "application-a", jobId: "job-a" };
    const base = {
      ...contact,
      applicationId: scope.applicationId,
      jobId: scope.jobId,
      channel: "linkedin" as const,
    };

    expect(
      saveDashboardOutreach(scope, {
        ...base,
        status: "SENT",
      }),
    ).toEqual({ ok: false, error: "invalid_outreach" });
    expect(
      saveDashboardOutreach(scope, {
        ...base,
        status: "REPLIED",
        sentAt: "2026-09-23T12:00:00.000Z",
      }),
    ).toEqual({ ok: false, error: "invalid_outreach" });
    expect(
      saveDashboardOutreach(scope, {
        ...base,
        status: "REPLIED",
        sentAt: "2026-09-23T12:00:00.000Z",
        repliedAt: "2026-09-23T11:00:00.000Z",
      }),
    ).toEqual({ ok: false, error: "invalid_outreach" });
  });

  it("rejeita regressão de status que contradiz timestamps existentes", () => {
    stubStorage();
    const scope = { applicationId: "application-a", jobId: "job-a" };
    const replied = {
      ...contact,
      applicationId: scope.applicationId,
      jobId: scope.jobId,
      status: "REPLIED" as const,
      sentAt: "2026-09-23T10:00:00.000Z",
      repliedAt: "2026-09-23T11:00:00.000Z",
      channel: "linkedin" as const,
    };
    persistDashboardContacts([replied], []);

    expect(
      saveDashboardOutreach(scope, {
        ...replied,
        status: "SENT",
      }),
    ).toEqual({ ok: false, error: "invalid_outreach" });
    expect(
      saveDashboardOutreach(scope, {
        ...replied,
        status: "MESSAGE_PREPARED",
      }),
    ).toEqual({ ok: false, error: "invalid_outreach" });
  });
});
