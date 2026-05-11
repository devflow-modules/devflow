import type { ApplyFlowApplication } from "./application-storage.js";

const CSV_COLUMNS_BASE = [
  "createdAt",
  "updatedAt",
  "source",
  "jobTitle",
  "companyName",
  "jobUrl",
  "status",
  "fitScore",
  "fieldsDetected",
  "fieldsFilled",
  "blockedCount",
  "failedCount",
  "notes",
] as const;

const CSV_COLUMNS_INTEL = [
  "seniority",
  "roleType",
  "workModel",
  "contractType",
  "englishRequired",
  "detectedSkills",
] as const;

type CsvColumnBase = (typeof CSV_COLUMNS_BASE)[number];
type CsvColumnIntel = (typeof CSV_COLUMNS_INTEL)[number];
type CsvColumn = CsvColumnBase | CsvColumnIntel;

const CSV_HEADER: CsvColumn[] = [...CSV_COLUMNS_BASE, ...CSV_COLUMNS_INTEL];

export type CsvExportRow = Record<CsvColumn, string | number | boolean | undefined>;

/** JSON com o registo completo (metadata local); sem texto de vaga nem respostas Easy Apply. */
export function applicationsToJson(applications: ApplyFlowApplication[]): string {
  return JSON.stringify(applications, null, 2);
}

function rowToCsvObject(app: ApplyFlowApplication): CsvExportRow {
  const jm = app.jobMeta;
  const base: CsvExportRow = {
    createdAt: app.createdAt,
    updatedAt: app.updatedAt,
    source: app.source,
    jobTitle: app.jobTitle,
    companyName: app.companyName,
    jobUrl: app.jobUrl,
    status: app.status,
    fitScore: app.fitScore,
    fieldsDetected: app.fieldsDetected,
    fieldsFilled: app.fieldsFilled,
    blockedCount: app.blockedCount,
    failedCount: app.failedCount,
    notes: app.notes,
    seniority: jm?.seniority,
    roleType: jm?.roleType,
    workModel: jm?.workModel,
    contractType: jm?.contractType,
    englishRequired: jm?.englishRequired,
    detectedSkills: jm?.detectedSkills?.join("|"),
  };
  return base;
}

/** CSV apenas com metadados acordados; não incluir texto de vaga nem respostas. */
export function applicationsToCsv(applications: ApplyFlowApplication[]): string {
  const rows: string[][] = [CSV_HEADER.map(String)];

  function esc(cell: unknown): string {
    const raw = cell === undefined || cell === null ? "" : String(cell);
    if (/[\r\n",]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
    return raw;
  }

  for (const app of applications) {
    const o = rowToCsvObject(app);
    rows.push(CSV_HEADER.map((c) => esc(o[c])));
  }
  return rows.map((line) => line.join(",")).join("\n") + "\n";
}

/**
 * Lista de propriedades que nunca fazem parte de ApplyFlowApplication;
 * garante ausência accidental em exportações.
 */
export const EXPORT_FORBIDDEN_PROPERTY_NAMES = ["suggestedValue", "labels", "jobText", "rawSnippet"] as const;
