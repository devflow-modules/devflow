import { z } from "zod";
import { careerApplicationStatusSchema, interviewPreparationSchema } from "@devflow/career-core";

const careerPrepRecordSchema = z.object({
  id: z.string().min(1),
  applicationId: z.string().min(1),
  company: z.string(),
  role: z.string(),
  status: careerApplicationStatusSchema,
  requiredSkills: z.array(z.string()),
  preparation: interviewPreparationSchema,
  createdAt: z.string().min(1),
  /** When set to `ats`, UI copy reflects resume–job analysis instead of ApplyFlow import. */
  prepSource: z.enum(["applyflow", "ats"]).optional(),
});

export type CareerPrepRecord = z.infer<typeof careerPrepRecordSchema>;

const STORAGE_KEY = "devflow:interview-lab:career-prep:v1";
const MAX_RECORDS = 40;

export function parseCareerPrepRecordItem(item: unknown): CareerPrepRecord | null {
  const r = careerPrepRecordSchema.safeParse(item);
  return r.success ? r.data : null;
}

export function loadCareerPrepRecords(): CareerPrepRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    const out: CareerPrepRecord[] = [];
    for (const el of data) {
      const row = parseCareerPrepRecordItem(el);
      if (row) out.push(row);
    }
    return out.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch {
    return [];
  }
}

export function loadCareerPrepById(id: string): CareerPrepRecord | null {
  return loadCareerPrepRecords().find((r) => r.id === id) ?? null;
}

export function appendCareerPrepRecord(record: CareerPrepRecord): void {
  if (typeof window === "undefined") return;
  const parsed = parseCareerPrepRecordItem(record);
  if (!parsed) return;
  const prev = loadCareerPrepRecords();
  const next = [parsed, ...prev.filter((r) => r.id !== parsed.id)].slice(0, MAX_RECORDS);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
