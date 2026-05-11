import type {
  ApplyFlowApplication,
  ApplyFlowApplicationStatus,
  ApplyFlowJobMeta,
  SaveApplicationInput,
} from "@devflow/applyflow-core";

import { applyFlowDebugLog } from "../content/applyflow-debug.js";
import { STORAGE_APPLICATIONS_KEY } from "./storage-types.js";

export type {
  ApplyFlowApplication,
  ApplyFlowApplicationStatus,
  ApplyFlowJobMeta,
  SaveApplicationInput,
} from "@devflow/applyflow-core";
export { APPLYFLOW_APPLICATION_STATUS_LABELS_PT } from "@devflow/applyflow-core";

const MAX_APPLICATIONS = 500;
export const STORAGE_APPLICATION_JSON_VERSION = 1 as const;

type StoredShape = {
  version: typeof STORAGE_APPLICATION_JSON_VERSION;
  applications: ApplyFlowApplication[];
};

const NOTES_MAX_LEN = 4000;
const META_MAX_LEN = 240;
const JOB_META_SKILL_MAX = 40;
const JOB_META_SKILL_LEN = 48;

const JOB_META_SENIORITY = new Set(["junior", "mid", "senior", "lead", "unknown"]);
const JOB_META_ROLE = new Set(["frontend", "backend", "fullstack", "mobile", "data", "devops", "unknown"]);
const JOB_META_WORK = new Set(["remote", "hybrid", "onsite", "unknown"]);
const JOB_META_CONTRACT = new Set(["clt", "pj", "contractor", "internship", "unknown"]);

function sanitizeJobMetaField(val: string | undefined, allowed: Set<string>): string | undefined {
  if (!val?.trim()) return undefined;
  const t = val.trim();
  return allowed.has(t) ? t : "unknown";
}

export function sanitizeApplyFlowJobMeta(meta: ApplyFlowJobMeta | undefined): ApplyFlowJobMeta | undefined {
  if (!meta) return undefined;
  const skillsRaw = Array.isArray(meta.detectedSkills) ? meta.detectedSkills : [];
  const seen = new Set<string>();
  const detectedSkills: string[] = [];
  for (const s of skillsRaw) {
    const x = sanitizeMeta(typeof s === "string" ? s.slice(0, JOB_META_SKILL_LEN) : "", JOB_META_SKILL_LEN);
    if (!x) continue;
    const k = x.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    detectedSkills.push(x);
    if (detectedSkills.length >= JOB_META_SKILL_MAX) break;
  }

  const out: ApplyFlowJobMeta = {
    seniority: sanitizeJobMetaField(meta.seniority, JOB_META_SENIORITY),
    roleType: sanitizeJobMetaField(meta.roleType, JOB_META_ROLE),
    workModel: sanitizeJobMetaField(meta.workModel, JOB_META_WORK),
    contractType: sanitizeJobMetaField(meta.contractType, JOB_META_CONTRACT),
    englishRequired: typeof meta.englishRequired === "boolean" ? meta.englishRequired : undefined,
    salaryMentioned: typeof meta.salaryMentioned === "boolean" ? meta.salaryMentioned : undefined,
    detectedSkills: detectedSkills.length ? detectedSkills : undefined,
  };

  const hasAny =
    out.seniority ||
    out.roleType ||
    out.workModel ||
    out.contractType ||
    out.englishRequired != null ||
    out.salaryMentioned != null ||
    (out.detectedSkills?.length ?? 0) > 0;
  return hasAny ? out : undefined;
}

export function normalizeStoredJobUrl(url: string | undefined): string | undefined {
  if (!url?.trim()) return undefined;
  try {
    const u = new URL(url.trim());
    u.hash = "";
    return u.toString();
  } catch {
    return url.trim();
  }
}

function nowId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    /* ignore */
  }
  return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function sanitizeMeta(s: string | undefined, maxLen: number): string | undefined {
  if (!s?.trim()) return undefined;
  const t = s.trim().replace(/\s+/g, " ");
  return t.length > maxLen ? t.slice(0, maxLen) : t;
}

function clampOptionalNonNegativeInt(n: unknown): number | undefined {
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0) return undefined;
  return Math.round(n);
}

function clampFitScore(n: unknown): number | undefined {
  if (typeof n !== "number" || !Number.isFinite(n)) return undefined;
  return Math.max(-1_000_000, Math.min(1_000_000, Math.round(n)));
}

function normalizeInput(input: SaveApplicationInput): Omit<ApplyFlowApplication, "id" | "createdAt" | "updatedAt"> {
  const base: Omit<ApplyFlowApplication, "id" | "createdAt" | "updatedAt"> = {
    source: input.source ?? "linkedin",
    jobTitle: sanitizeMeta(input.jobTitle, META_MAX_LEN),
    companyName: sanitizeMeta(input.companyName, META_MAX_LEN),
    jobUrl: normalizeStoredJobUrl(input.jobUrl),
    status: input.status ?? "reviewing",
    fitScore: clampFitScore(input.fitScore),
    fieldsDetected: clampOptionalNonNegativeInt(input.fieldsDetected),
    fieldsFilled: clampOptionalNonNegativeInt(input.fieldsFilled),
    blockedCount: clampOptionalNonNegativeInt(input.blockedCount),
    failedCount: clampOptionalNonNegativeInt(input.failedCount),
    notes: sanitizeMeta(input.notes, NOTES_MAX_LEN),
  };
  if (input.jobMeta !== undefined) {
    const jm = sanitizeApplyFlowJobMeta(input.jobMeta);
    if (jm) base.jobMeta = jm;
  }
  return base;
}

async function load(): Promise<ApplyFlowApplication[]> {
  try {
    const bag = await chrome.storage.local.get(STORAGE_APPLICATIONS_KEY);
    const raw = bag[STORAGE_APPLICATIONS_KEY as keyof typeof bag];
    const doc = raw as StoredShape | undefined;
    if (doc?.version === STORAGE_APPLICATION_JSON_VERSION && Array.isArray(doc.applications)) return doc.applications;
  } catch {
    /* swallow */
  }
  return [];
}

function sortAppsNewestFirst(apps: ApplyFlowApplication[]): ApplyFlowApplication[] {
  return [...apps].sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
}

async function persist(appsSorted: ApplyFlowApplication[]): Promise<void> {
  const trimmed = appsSorted.slice(0, MAX_APPLICATIONS);
  const payload: StoredShape = {
    version: STORAGE_APPLICATION_JSON_VERSION,
    applications: trimmed,
  };
  await chrome.storage.local.set({ [STORAGE_APPLICATIONS_KEY]: payload });
}

export async function getApplications(): Promise<ApplyFlowApplication[]> {
  return sortAppsNewestFirst(await load());
}

export async function findApplicationByNormalizedJobUrl(jobUrlHref: string): Promise<ApplyFlowApplication | null> {
  const want = normalizeStoredJobUrl(jobUrlHref);
  if (!want) return null;
  const apps = sortAppsNewestFirst(await load());
  return apps.find((a) => normalizeStoredJobUrl(a.jobUrl) === want) ?? null;
}

/** Cria atualiza registo; deduplica por `jobUrl` normalizado quando existir. */
export async function saveApplication(rawInput: SaveApplicationInput): Promise<ApplyFlowApplication> {
  const input = normalizeInput(rawInput);

  let apps = sortAppsNewestFirst(await load());
  const iso = () => new Date().toISOString();
  const now = iso();

  const normUrl = input.jobUrl;
  const dupIdx = normUrl !== undefined ? apps.findIndex((a) => normalizeStoredJobUrl(a.jobUrl) === normUrl) : -1;

  if (dupIdx >= 0) {
    const dup = apps[dupIdx]!;
    const merged: ApplyFlowApplication = {
      ...dup,
      ...input,
      id: dup.id,
      createdAt: dup.createdAt,
      updatedAt: now,
    };
    apps.splice(dupIdx, 1);
    apps.unshift(merged);
    await persist(apps);

    applyFlowDebugLog("application deduped by URL", { id: merged.id });
    applyFlowDebugLog("application saved", {
      mode: "dedupe",
      id: merged.id,
      status: merged.status,
    });

    return merged;
  }

  const nu: ApplyFlowApplication = {
    id: nowId(),
    createdAt: now,
    updatedAt: now,
    ...input,
  };
  apps = [nu, ...apps.filter((a) => a.id !== nu.id)];
  await persist(apps);

  applyFlowDebugLog("application saved", {
    mode: "create",
    id: nu.id,
    status: nu.status,
    jobTitleLen: nu.jobTitle?.length ?? 0,
    urlPresent: Boolean(nu.jobUrl),
  });

  return nu;
}

export async function updateApplicationStatus(id: string, status: ApplyFlowApplicationStatus): Promise<ApplyFlowApplication | null> {
  const apps = sortAppsNewestFirst(await load());
  const ix = apps.findIndex((a) => a.id === id);
  if (ix < 0) return null;
  const now = new Date().toISOString();
  const updated: ApplyFlowApplication = { ...apps[ix]!, status, updatedAt: now };
  apps.splice(ix, 1);
  apps.unshift(updated);
  await persist(apps);

  applyFlowDebugLog("application status updated", { id, status });
  return updated;
}

export async function updateApplicationNotes(id: string, notes: string | undefined): Promise<ApplyFlowApplication | null> {
  const apps = sortAppsNewestFirst(await load());
  const ix = apps.findIndex((a) => a.id === id);
  if (ix < 0) return null;
  const now = new Date().toISOString();
  const nextNotes =
    notes === undefined || notes.trim().length === 0 ? undefined : sanitizeMeta(notes, NOTES_MAX_LEN);
  const updated: ApplyFlowApplication = {
    ...apps[ix]!,
    notes: nextNotes,
    updatedAt: now,
  };
  apps.splice(ix, 1);
  apps.unshift(updated);
  await persist(apps);

  applyFlowDebugLog("application notes updated", { id, notesLen: nextNotes?.length ?? 0 });
  return updated;
}

export async function deleteApplication(id: string): Promise<void> {
  const apps = await load();
  const next = apps.filter((a) => a.id !== id);
  await persist(sortAppsNewestFirst(next));

  applyFlowDebugLog("application deleted", { id });
}

export async function clearApplications(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_APPLICATIONS_KEY);
}
