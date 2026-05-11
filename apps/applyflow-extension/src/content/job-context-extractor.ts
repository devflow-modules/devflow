import { calculateFitScore, extractJobIntelligence, type CandidateProfile } from "@devflow/applyflow-core";
import type { JobContext } from "@devflow/applyflow-linkedin";

import type { AutofillSessionCounters } from "./autofill/autofill-session.js";
import { normalizeStoredJobUrl, type ApplyFlowJobMeta, type SaveApplicationInput } from "../storage/application-storage.js";

/** Texto limitado da página da vaga para heurística de fit — não é armazenado no histórico. */
export function scrapeJobPageTextLite(dom: Pick<Document, "querySelectorAll"> = document): string {
  const candidates = [
    ".jobs-description-content__text",
    ".jobs-details-top-card",
    ".job-details-jobs-unified-top-card__container",
    ".jobs-unified-top-card__job-title",
  ];
  const parts: string[] = [];
  for (const sel of candidates) {
    dom.querySelectorAll<HTMLElement>(sel).forEach((el) => {
      const t = el.innerText?.trim();
      if (t) parts.push(t.slice(0, 12_000));
    });
  }
  return parts.join("\n\n").trim();
}

/**
 * Dicas de DOM para título / empresa quando o markdown do painel falhar.
 * Heurísticas best-effort por classes comuns na UI de vagas LinkedIn.
 */
export function extractDomJobHints(dom: Pick<Document, "querySelector"> = document): {
  jobTitle?: string;
  companyName?: string;
} {
  const titleEl =
    dom.querySelector(".jobs-unified-top-card__job-title") ??
    dom.querySelector(".jobs-details-top-card__job-title") ??
    dom.querySelector('h1[data-test-job-card-title], h1[class*="job-title"]') ??
    dom.querySelector("h1");
  const companyEl =
    dom.querySelector(".job-details-jobs-unified-top-card__company-name a") ??
    dom.querySelector(".jobs-unified-top-card__company-name a") ??
    dom.querySelector(".jobs-unified-top-card__subtitle-primary-grouping") ??
    dom.querySelector('[data-test-job-card-company-name]');

  const jobTitle = titleEl?.textContent?.trim() || undefined;
  const companyName = companyEl?.textContent?.trim() || undefined;
  return { jobTitle, companyName };
}

/** Metadados inferidos de um excerto de texto (≤16k) — nunca persiste o texto em si. */
export function buildJobMetaFromTextSlice(raw: string, maxLen = 16_000): ApplyFlowJobMeta | undefined {
  const slice = raw.trim().slice(0, maxLen);
  if (!slice) return undefined;
  const j = extractJobIntelligence(slice);
  return {
    seniority: j.seniority,
    roleType: j.roleType,
    workModel: j.workModel,
    contractType: j.contractType,
    englishRequired: j.englishRequired,
    salaryMentioned: j.salaryMentioned,
    detectedSkills: j.detectedSkills.length ? j.detectedSkills : undefined,
  };
}

export function currentPageJobUrl(href?: string): string | undefined {
  const h = href ?? (typeof window !== "undefined" ? window.location.href : undefined);
  return normalizeStoredJobUrl(h);
}

export function computeJobSnapshotForHistory(args: {
  jobContext: JobContext;
  jobText?: string;
  profile: CandidateProfile;
  fieldsDetectedCount: number;
  session: AutofillSessionCounters;
  locationHref?: string;
}): SaveApplicationInput {
  const domHints = typeof document !== "undefined" ? extractDomJobHints(document) : {};
  const title = args.jobContext.title?.trim() || domHints.jobTitle?.trim();
  const company = args.jobContext.company?.trim() || domHints.companyName?.trim();
  const textForFit =
    args.jobText?.trim() ||
    (typeof document !== "undefined" ? scrapeJobPageTextLite(document) : "");
  const fit = calculateFitScore(textForFit, args.profile);
  const href = args.locationHref ?? (typeof window !== "undefined" ? window.location.href : "");
  const jobMeta = buildJobMetaFromTextSlice(textForFit, 16_000);

  return {
    jobTitle: title,
    companyName: company,
    jobUrl: normalizeStoredJobUrl(href),
    fitScore: fit.score,
    fieldsDetected: Math.max(0, Math.round(args.fieldsDetectedCount)),
    fieldsFilled: args.session.filled,
    blockedCount: args.session.blocked,
    failedCount: args.session.failed,
    ...(jobMeta ? { jobMeta } : {}),
  };
}
