import type { ApplyFlowApplication, ApplyFlowApplicationStatus } from "@devflow/applyflow-core";
import {
  createCareerBundle,
  createCareerBundleWithSyncEnrichment,
  getInterviewReadyApplications,
  serializeCareerBundleWithSyncEnrichment,
  type CareerApplication,
  type CareerBundle,
  type CareerBundleWithSyncEnrichment,
} from "@devflow/career-core";
import { buildApplyFlowDemoSyncEnrichment } from "./career-bundle-demo-sync-enrichment";
import { stringifyCareerBundleJson } from "./interview-lab-handoff";

function mapApplyFlowStatus(status: ApplyFlowApplicationStatus): CareerApplication["status"] {
  switch (status) {
    case "reviewing":
      return "saved";
    case "applied":
      return "applied";
    case "ignored":
      return "rejected";
    case "waiting_response":
      return "interview_requested";
    case "interview":
    case "technical_test":
      return "interview_scheduled";
    case "rejected":
      return "rejected";
    case "accepted":
      return "offer";
    default:
      return "saved";
  }
}

export function mapApplyFlowApplicationToCareer(app: ApplyFlowApplication): CareerApplication {
  const skills = app.jobMeta?.detectedSkills?.length ? [...app.jobMeta.detectedSkills] : [];
  const wm = app.jobMeta?.workModel;
  const remote = wm === "remote" ? true : wm === "hybrid" ? true : wm === "onsite" ? false : undefined;

  const appliedAt =
    app.status === "applied" ||
    app.status === "interview" ||
    app.status === "technical_test" ||
    app.status === "waiting_response" ||
    app.status === "accepted" ||
    app.status === "rejected"
      ? app.updatedAt
      : undefined;

  return {
    id: app.id,
    company: (app.companyName?.trim() || "Unknown").slice(0, 200),
    role: (app.jobTitle?.trim() || "Unknown role").slice(0, 200),
    remote,
    seniority: app.jobMeta?.seniority,
    source: "linkedin",
    requiredSkills: skills,
    status: mapApplyFlowStatus(app.status),
    appliedAt,
    notes: app.notes?.slice(0, 2000),
    matchScore: app.fitScore,
  };
}

export function buildSingleRowCareerBundleForInterviewLab(app: ApplyFlowApplication): CareerBundle {
  return createCareerBundle([mapApplyFlowApplicationToCareer(app)]);
}

/** Preferência: entrevista; senão applied/saved; senão todas (ex.: só ignoradas no dataset). */
export function selectApplicationsForInterviewLabBundle(mapped: CareerApplication[]): CareerApplication[] {
  const draft = createCareerBundle(mapped);
  const ready = getInterviewReadyApplications(draft);
  if (ready.length > 0) return ready;
  const soft = mapped
    .filter((a) => a.status === "applied" || a.status === "saved")
    .sort((a, b) => a.id.localeCompare(b.id));
  if (soft.length > 0) return soft;
  return [...mapped].sort((a, b) => a.id.localeCompare(b.id));
}

export function buildInterviewLabCareerBundle(applications: ApplyFlowApplication[]): CareerBundle {
  const mapped = applications.map(mapApplyFlowApplicationToCareer);
  const subset = selectApplicationsForInterviewLabBundle(mapped);
  return createCareerBundle(subset);
}

export type InterviewLabCareerBundleExportOptions = {
  includeDemoSyncEnrichment?: boolean;
};

export function buildInterviewLabCareerBundleForExport(
  applications: ApplyFlowApplication[],
  options?: InterviewLabCareerBundleExportOptions,
): CareerBundle | CareerBundleWithSyncEnrichment {
  const base = buildInterviewLabCareerBundle(applications);
  if (!options?.includeDemoSyncEnrichment) {
    return base;
  }
  return createCareerBundleWithSyncEnrichment(base.applications, {
    syncEnrichment: buildApplyFlowDemoSyncEnrichment({ generatedAt: base.exportedAt }),
    exportedAt: base.exportedAt,
  });
}

export function stringifyInterviewLabCareerBundleExport(
  bundle: CareerBundle | CareerBundleWithSyncEnrichment,
): string {
  if ("syncEnrichment" in bundle && bundle.syncEnrichment != null) {
    return serializeCareerBundleWithSyncEnrichment(bundle);
  }
  return stringifyCareerBundleJson(bundle);
}

export function downloadCareerBundleJson(bundle: CareerBundle | CareerBundleWithSyncEnrichment): void {
  const blob = new Blob([stringifyInterviewLabCareerBundleExport(bundle)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = bundle.exportedAt.slice(0, 10);
  a.href = url;
  a.download = `applyflow-interview-lab-${stamp}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
