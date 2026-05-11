import type { Confidence } from "@devflow/applyflow-core";

import { STORAGE_AUTOFILL_AUDIT_KEY } from "./storage-types.js";

const MAX_ENTRIES = 100;

export type AutofillAuditEntry = {
  id: string;
  timestamp: string;
  jobTitle?: string;
  companyName?: string;
  /** Tipologia do DOM (input/textarea/select/radio-group…) — não contém valores. */
  fieldType: string;
  classificationType: string;
  confidence: Confidence;
  result: "success" | "failed" | "blocked";
  reason?: string;
};

type StoredShape = {
  version: 1;
  entries: AutofillAuditEntry[];
};

function nowId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

async function load(): Promise<AutofillAuditEntry[]> {
  try {
    const bag = await chrome.storage.local.get(STORAGE_AUTOFILL_AUDIT_KEY);
    const raw = bag[STORAGE_AUTOFILL_AUDIT_KEY as keyof typeof bag];
    const doc = raw as StoredShape | undefined;
    if (doc?.version === 1 && Array.isArray(doc.entries)) return doc.entries;
  } catch {
    /* swallow */
  }
  return [];
}

async function persist(entries: AutofillAuditEntry[]): Promise<void> {
  const trimmed = entries.slice(-MAX_ENTRIES);
  const payload: StoredShape = { version: 1, entries: trimmed };
  await chrome.storage.local.set({ [STORAGE_AUTOFILL_AUDIT_KEY]: payload });
}

/** Enfileira entrada de auditoria (sem label completo nem suggestedValue). */
export async function addAutofillAuditEntry(
  partial: Omit<AutofillAuditEntry, "id" | "timestamp"> &
    Partial<Pick<AutofillAuditEntry, "id" | "timestamp">>,
): Promise<void> {
  const entry: AutofillAuditEntry = {
    ...partial,
    id: partial.id ?? nowId(),
    timestamp: partial.timestamp ?? new Date().toISOString(),
  };

  const current = await load();
  await persist([...current, entry]);
}

export async function getAutofillAuditEntries(): Promise<AutofillAuditEntry[]> {
  return load();
}

export async function clearAutofillAuditEntries(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_AUTOFILL_AUDIT_KEY);
}
