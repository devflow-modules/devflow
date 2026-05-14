import { parseCareerBundle, type CareerBundle } from "@devflow/career-core";

const STORAGE_KEY = "devflow:interview-lab:applyflow-career-bundle:v1";

export function persistApplyFlowCareerBundle(bundle: CareerBundle): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bundle));
}

export function loadApplyFlowCareerBundle(): CareerBundle | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    const r = parseCareerBundle(parsed);
    return r.ok ? r.data : null;
  } catch {
    return null;
  }
}

export function clearApplyFlowCareerBundle(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
