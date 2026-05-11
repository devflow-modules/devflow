import { applyFlowDebugLog } from "../content/applyflow-debug.js";
import { STORAGE_AI_AUDIT_KEY } from "./storage-types.js";

const MAX_ENTRIES = 100;

export type AiAuditEntry = {
  id: string;
  timestamp: string;
  task: string;
  result: "success" | "failed";
  reason?: string;
  generatedLength?: number;
};

type StoredShape = { version: 1; entries: AiAuditEntry[] };

function nowId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

async function load(): Promise<AiAuditEntry[]> {
  try {
    const bag = await chrome.storage.local.get(STORAGE_AI_AUDIT_KEY);
    const raw = bag[STORAGE_AI_AUDIT_KEY as keyof typeof bag];
    const doc = raw as StoredShape | undefined;
    if (doc?.version === 1 && Array.isArray(doc.entries)) return doc.entries;
  } catch {
    /* ignore */
  }
  return [];
}

async function persist(entries: AiAuditEntry[]): Promise<void> {
  const trimmed = entries.slice(-MAX_ENTRIES);
  await chrome.storage.local.set({
    [STORAGE_AI_AUDIT_KEY]: { version: 1, entries: trimmed } satisfies StoredShape,
  });
}

export async function addAiAuditEntry(
  partial: Omit<AiAuditEntry, "id" | "timestamp"> & Partial<Pick<AiAuditEntry, "id" | "timestamp">>,
): Promise<void> {
  const entry: AiAuditEntry = {
    ...partial,
    id: partial.id ?? nowId(),
    timestamp: partial.timestamp ?? new Date().toISOString(),
  };
  applyFlowDebugLog("ai audit entry", {
    task: entry.task,
    result: entry.result,
    reasonLen: entry.reason?.length ?? 0,
    generatedLength: entry.generatedLength ?? 0,
  });
  const cur = await load();
  await persist([...cur, entry]);
}

export async function getAiAuditEntries(): Promise<AiAuditEntry[]> {
  return load();
}

export async function clearAiAuditEntries(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_AI_AUDIT_KEY);
}
