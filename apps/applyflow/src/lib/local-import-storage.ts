import type { ApplyFlowApplication, DashboardStoredImport } from "@devflow/applyflow-core";

export const APPLYFLOW_DASHBOARD_STORAGE_KEY = "APPLYFLOW_DASHBOARD_IMPORT_V1" as const;

export function loadDashboardImport(): DashboardStoredImport | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(APPLYFLOW_DASHBOARD_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as unknown;
    if (
      !data ||
      typeof data !== "object" ||
      (data as DashboardStoredImport).version !== 1 ||
      !Array.isArray((data as DashboardStoredImport).applications)
    ) {
      return null;
    }
    return data as DashboardStoredImport;
  } catch {
    return null;
  }
}

export function persistDashboardImport(applications: ApplyFlowApplication[]): void {
  if (typeof window === "undefined") return;
  const doc: DashboardStoredImport = {
    version: 1,
    importedAt: new Date().toISOString(),
    applications,
  };
  window.localStorage.setItem(APPLYFLOW_DASHBOARD_STORAGE_KEY, JSON.stringify(doc));
}

export function clearPersistedDashboardImport(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(APPLYFLOW_DASHBOARD_STORAGE_KEY);
}
