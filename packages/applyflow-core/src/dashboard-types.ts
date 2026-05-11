import type { ApplyFlowApplication, ApplyFlowApplicationStatus } from "./application-types.js";
import type { ApplicationsPeriodFilter } from "./application-metrics.js";

/** Estado de filtros da tabela / vistas do dashboard web (local-first). */
export type DashboardTableFilters = {
  period: ApplicationsPeriodFilter;
  status: ApplyFlowApplicationStatus | "all";
  skill: string;
  workModel: string;
  contractType: string;
  englishRequired: "all" | "yes" | "no";
};

export type DashboardImportSummary = {
  loadedCount: number;
  ignoredCount: number;
  oldestCreatedAt?: string;
  newestCreatedAt?: string;
};

export type DashboardStoredImport = {
  version: 1;
  importedAt: string;
  applications: ApplyFlowApplication[];
};
