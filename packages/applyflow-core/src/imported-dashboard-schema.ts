import { parseApplyFlowApplicationsImport } from "./imported-application-schema.js";
import type { ParsedApplyFlowImportResult } from "./imported-application-schema.js";
import { isApplyFlowJobsImportV2, parseApplyFlowJobsImport } from "./imported-job-schema.js";
import type { ParsedApplyFlowJobsImportResult } from "./imported-job-schema.js";
import type { CandidateProfile } from "./profile-schema.js";

export type ParsedApplyFlowDashboardImport =
  | { ok: true; kind: "applications"; result: Extract<ParsedApplyFlowImportResult, { ok: true }> }
  | { ok: true; kind: "jobs"; result: Extract<ParsedApplyFlowJobsImportResult, { ok: true }> }
  | { ok: false; error: string };

export function parseApplyFlowDashboardImportJsonString(
  text: string,
  options: { profile: CandidateProfile; now?: Date },
): ParsedApplyFlowDashboardImport {
  let data: unknown;
  try {
    data = JSON.parse(text) as unknown;
  } catch {
    return { ok: false, error: "Ficheiro não é JSON válido." };
  }

  if (isApplyFlowJobsImportV2(data)) {
    const jobs = parseApplyFlowJobsImport(data, options);
    if (!jobs.ok) return { ok: false, error: jobs.error };
    return { ok: true, kind: "jobs", result: jobs };
  }

  const applications = parseApplyFlowApplicationsImport(data);
  if (!applications.ok) return { ok: false, error: applications.error };
  return { ok: true, kind: "applications", result: applications };
}
