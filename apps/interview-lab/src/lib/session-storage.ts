import { z } from "zod";
import type { ChecklistState, SessionRecord } from "./types";
import { emptyChecklist } from "./types";

const checklistIdSchema = z.enum([
  "restated",
  "ioConfirmed",
  "explainedApproach",
  "pseudocode",
  "testedExamples",
  "complexity",
  "noLongSilence",
]);

const checklistStateSchema = z.object({
  restated: z.boolean(),
  ioConfirmed: z.boolean(),
  explainedApproach: z.boolean(),
  pseudocode: z.boolean(),
  testedExamples: z.boolean(),
  complexity: z.boolean(),
  noLongSilence: z.boolean(),
}) satisfies z.ZodType<ChecklistState>;

const sessionRecordSchema = z.object({
  id: z.string().min(1),
  problemId: z.string().min(1),
  code: z.string(),
  elapsedTimeSec: z.number().nonnegative(),
  checklist: checklistStateSchema,
  passedTests: z.number().int().nonnegative(),
  totalTests: z.number().int().nonnegative(),
  createdAt: z.string().min(1),
  freezeReasons: z.array(z.string()).max(24).optional(),
  confidenceBefore: z.number().int().min(1).max(5).optional(),
  confidenceAfter: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(8000).optional(),
  spokenEnglishNotes: z.string().max(8000).optional(),
  testOutcomes: z
    .array(
      z.object({
        id: z.string(),
        pass: z.boolean(),
        expected: z.unknown().optional(),
        received: z.unknown().optional(),
        detail: z.string().optional(),
      }),
    )
    .max(48)
    .optional(),
  noSilenceMode: z.enum(["off", "gentle", "interview"]).optional(),
  nudgeCount: z.number().int().nonnegative().optional(),
  manualSpeakResetCount: z.number().int().nonnegative().optional(),
  keyboardRescueUsed: z.union([z.boolean(), z.null()]).optional(),
  keyboardIssueNotes: z.string().max(8000).optional(),
});

const STORAGE_KEY = "devflow:interview-lab:sessions";
const MAX_SESSIONS = 80;

function safeParseChecklist(raw: unknown): ChecklistState {
  const r = checklistStateSchema.safeParse(raw);
  if (r.success) return r.data;
  return emptyChecklist();
}

/** Parse de um item (útil em testes e para tolerar entradas antigas). */
export function parseSessionRecordItem(item: unknown): SessionRecord | null {
  const r = sessionRecordSchema.safeParse(item);
  return r.success ? r.data : null;
}

/** Parse do array completo em memória (sem `localStorage`). */
export function parseSessionsFromUnknown(data: unknown): SessionRecord[] {
  if (!Array.isArray(data)) return [];
  const out: SessionRecord[] = [];
  for (const el of data) {
    const row = parseSessionRecordItem(el);
    if (row) out.push(row);
  }
  return out.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function loadSessions(): SessionRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return parseSessionsFromUnknown(parsed);
  } catch {
    return [];
  }
}

export function loadSessionById(id: string): SessionRecord | null {
  return loadSessions().find((s) => s.id === id) ?? null;
}

export function appendSession(session: SessionRecord): void {
  if (typeof window === "undefined") return;
  const prev = loadSessions();
  const next = [session, ...prev].slice(0, MAX_SESSIONS);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export type SessionPatch = Partial<
  Pick<
    SessionRecord,
    | "freezeReasons"
    | "confidenceBefore"
    | "confidenceAfter"
    | "notes"
    | "spokenEnglishNotes"
    | "keyboardRescueUsed"
    | "keyboardIssueNotes"
  >
>;

/** Atualiza campos opcionais Sprint 0.2 numa sessão existente. */
export function updateSession(sessionId: string, patch: SessionPatch): { ok: true } | { ok: false; reason: string } {
  if (typeof window === "undefined") return { ok: false, reason: "No window" };
  const sessions = loadSessions();
  const idx = sessions.findIndex((s) => s.id === sessionId);
  if (idx === -1) return { ok: false, reason: "Session not found" };

  const clean = Object.fromEntries(
    Object.entries(patch).filter(([, v]) => v !== undefined),
  ) as SessionPatch;

  const merged = { ...sessions[idx], ...clean };
  const parsed = parseSessionRecordItem(merged);
  if (!parsed) return { ok: false, reason: "Invalid session data" };

  const next = [...sessions];
  next[idx] = parsed;
  next.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return { ok: true };
}

export function parseChecklistFromUnknown(raw: unknown): ChecklistState {
  if (!raw || typeof raw !== "object") return emptyChecklist();
  const o = raw as Record<string, unknown>;
  const next: Partial<ChecklistState> = {};
  for (const id of checklistIdSchema.options) {
    next[id] = Boolean(o[id]);
  }
  return safeParseChecklist(next);
}
