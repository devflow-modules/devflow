import type { ApplyFlowApplicationV2Envelope } from "./application-record-v2.js";
import type { ApplyFlowJob } from "./job-match-types.js";

export const APPLICATION_JOB_TITLE_MISSING = "Cargo não informado";
export const APPLICATION_COMPANY_MISSING = "Empresa não informada";

function linkedJobMatchesSource(
  application: Pick<ApplyFlowApplicationV2Envelope, "v2">,
  linkedJob?: Pick<ApplyFlowJob, "id"> | null,
): linkedJob is Pick<ApplyFlowJob, "id"> {
  const sourceJobId = application.v2?.sourceJobId?.trim();
  return Boolean(sourceJobId && linkedJob?.id === sourceJobId);
}

/**
 * Prefer Application fields; fall back to the unambiguously linked job; else a clear absence label.
 * Does not invent send dates or mutate the Application record.
 */
export function resolveApplicationJobTitle(
  application: Pick<ApplyFlowApplicationV2Envelope, "jobTitle" | "v2">,
  linkedJob?: Pick<ApplyFlowJob, "id" | "title"> | null,
): string {
  const own = application.jobTitle?.trim();
  if (own) return own;
  if (linkedJobMatchesSource(application, linkedJob)) {
    const fromJob = linkedJob.title?.trim();
    if (fromJob) return fromJob;
  }
  return APPLICATION_JOB_TITLE_MISSING;
}

export function resolveApplicationCompanyName(
  application: Pick<ApplyFlowApplicationV2Envelope, "companyName" | "v2">,
  linkedJob?: Pick<ApplyFlowJob, "id" | "company"> | null,
): string {
  const own = application.companyName?.trim();
  if (own) return own;
  if (linkedJobMatchesSource(application, linkedJob)) {
    const fromJob = linkedJob.company?.trim();
    if (fromJob) return fromJob;
  }
  return APPLICATION_COMPANY_MISSING;
}
