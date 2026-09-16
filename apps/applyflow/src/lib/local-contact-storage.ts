import type { Contact, ContactInteraction } from "@devflow/applyflow-core";

export const APPLYFLOW_DASHBOARD_CONTACTS_STORAGE_KEY = "APPLYFLOW_DASHBOARD_CONTACTS_V1" as const;
export const DASHBOARD_CONTACTS_STORAGE_VERSION = 1 as const;

export type DashboardStoredContacts = {
  version: typeof DASHBOARD_CONTACTS_STORAGE_VERSION;
  savedAt: string;
  contacts: Contact[];
  interactions: ContactInteraction[];
};

export type DashboardContactsLoadResult = {
  contacts: Contact[];
  interactions: ContactInteraction[];
  status: "empty" | "ok" | "unreadable";
};

function emptyResult(): DashboardContactsLoadResult {
  return { contacts: [], interactions: [], status: "empty" };
}

export function loadDashboardContacts(): DashboardContactsLoadResult {
  if (typeof window === "undefined") return emptyResult();
  const raw = window.localStorage.getItem(APPLYFLOW_DASHBOARD_CONTACTS_STORAGE_KEY);
  if (!raw) return emptyResult();
  try {
    const data = JSON.parse(raw) as DashboardStoredContacts;
    if (data.version !== DASHBOARD_CONTACTS_STORAGE_VERSION) {
      return { contacts: [], interactions: [], status: "unreadable" };
    }
    return {
      contacts: Array.isArray(data.contacts) ? data.contacts : [],
      interactions: Array.isArray(data.interactions) ? data.interactions : [],
      status: "ok",
    };
  } catch {
    return { contacts: [], interactions: [], status: "unreadable" };
  }
}

export function persistDashboardContacts(contacts: Contact[], interactions: ContactInteraction[]): void {
  if (typeof window === "undefined") return;
  const doc: DashboardStoredContacts = {
    version: DASHBOARD_CONTACTS_STORAGE_VERSION,
    savedAt: new Date().toISOString(),
    contacts,
    interactions,
  };
  window.localStorage.setItem(APPLYFLOW_DASHBOARD_CONTACTS_STORAGE_KEY, JSON.stringify(doc));
}

export function clearPersistedDashboardContacts(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(APPLYFLOW_DASHBOARD_CONTACTS_STORAGE_KEY);
}
