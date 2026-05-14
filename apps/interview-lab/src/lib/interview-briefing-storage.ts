import { z } from "zod";
import { briefingInputSchema } from "./interview-briefing";
import type { InterviewBriefingContent } from "./interview-briefing";

const briefingContentSchema = z.object({
  corePitch: z.array(z.string()),
  roleAlignment: z.array(z.string()),
  projectCards: z.array(
    z.object({
      title: z.string(),
      bullets: z.array(z.string()),
    }),
  ),
  likelyTechnicalQuestions: z.array(z.string()),
  likelyBehavioralQuestions: z.array(z.string()),
  starOutlines: z.array(
    z.object({
      title: z.string(),
      bullets: z.array(z.string()),
    }),
  ),
  questionsForInterviewer: z.array(z.string()),
  vocabularyNotes: z.array(z.string()),
  finalChecklist: z.array(z.string()),
});

const briefingRecordSchema = z.object({
  id: z.string().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  title: z.string().min(1).max(400),
  input: briefingInputSchema,
  content: briefingContentSchema,
});

export type InterviewBriefingRecord = z.infer<typeof briefingRecordSchema>;

const STORAGE_KEY = "devflow:interview-lab:interview-briefing:v1";
const MAX_BRIEFINGS = 24;

export function parseBriefingRecordItem(item: unknown): InterviewBriefingRecord | null {
  const r = briefingRecordSchema.safeParse(item);
  return r.success ? r.data : null;
}

export function loadInterviewBriefings(): InterviewBriefingRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    const out: InterviewBriefingRecord[] = [];
    for (const el of data) {
      const row = parseBriefingRecordItem(el);
      if (row) out.push(row);
    }
    return out.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch {
    return [];
  }
}

export function loadInterviewBriefingById(id: string): InterviewBriefingRecord | null {
  return loadInterviewBriefings().find((r) => r.id === id) ?? null;
}

export function saveInterviewBriefing(record: InterviewBriefingRecord): void {
  if (typeof window === "undefined") return;
  const parsed = parseBriefingRecordItem(record);
  if (!parsed) return;
  const prev = loadInterviewBriefings();
  const next = [parsed, ...prev.filter((r) => r.id !== parsed.id)].slice(0, MAX_BRIEFINGS);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function deleteInterviewBriefing(id: string): void {
  if (typeof window === "undefined") return;
  const next = loadInterviewBriefings().filter((r) => r.id !== id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function buildBriefingRecord(
  title: string,
  input: z.infer<typeof briefingInputSchema>,
  content: InterviewBriefingContent,
  existingId?: string,
): InterviewBriefingRecord {
  const now = new Date().toISOString();
  const id = existingId ?? crypto.randomUUID();
  let createdAt = now;
  if (existingId) {
    const prev = loadInterviewBriefings().find((r) => r.id === existingId);
    if (prev) createdAt = prev.createdAt;
  }
  return {
    id,
    title: title.slice(0, 400),
    createdAt,
    updatedAt: now,
    input: briefingInputSchema.parse(input),
    content,
  };
}
