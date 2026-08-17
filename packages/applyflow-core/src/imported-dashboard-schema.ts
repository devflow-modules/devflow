import { parseApplyFlowApplicationsImport } from "./imported-application-schema.js";
import type { ParsedApplyFlowImportResult } from "./imported-application-schema.js";
import { isApplyFlowJobsImportV2, parseApplyFlowJobsImport } from "./imported-job-schema.js";
import type { ParsedApplyFlowJobsImportResult } from "./imported-job-schema.js";
import { parseResumeLibraryImport } from "./imported-resume-library-schema.js";
import type { CandidateProfile } from "./profile-schema.js";
import { isResumeLibraryImportV1 } from "./resume-library-schema.js";
import type { ResumeLibrary } from "./resume-library-types.js";

export type ParsedApplyFlowDashboardImport =
  | { ok: true; kind: "applications"; result: Extract<ParsedApplyFlowImportResult, { ok: true }> }
  | { ok: true; kind: "jobs"; result: Extract<ParsedApplyFlowJobsImportResult, { ok: true }> }
  | { ok: true; kind: "resume-library"; library: ResumeLibrary }
  | { ok: true; kind: "resume-profile"; profile: CandidateProfile }
  | { ok: false; error: string };

export function parseApplyFlowDashboardImportJsonString(
  text: string,
  options: { profile: CandidateProfile; resumeLibrary?: ResumeLibrary; now?: Date },
): ParsedApplyFlowDashboardImport {
  let data: unknown;
  try {
    data = JSON.parse(text) as unknown;
  } catch {
    return { ok: false, error: "Ficheiro não é JSON válido." };
  }

  if (isResumeLibraryImportV1(data)) {
    const resumes = parseResumeLibraryImport(data);
    if (!resumes.ok) return { ok: false, error: resumes.error };
    if (resumes.kind === "resume-library") {
      return { ok: true, kind: "resume-library", library: resumes.library };
    }
    return { ok: false, error: "Import de currículos inválido." };
  }

  if (isApplyFlowJobsImportV2(data)) {
    const jobs = parseApplyFlowJobsImport(data, options);
    if (!jobs.ok) return { ok: false, error: jobs.error };
    return { ok: true, kind: "jobs", result: jobs };
  }

  const applications = parseApplyFlowApplicationsImport(data);
  if (applications.ok) {
    return { ok: true, kind: "applications", result: applications };
  }

  const resumeProfile = parseResumeLibraryImport(data);
  if (resumeProfile.ok && resumeProfile.kind === "resume-profile") {
    return { ok: true, kind: "resume-profile", profile: resumeProfile.profile };
  }

  return { ok: false, error: applications.error };
}
