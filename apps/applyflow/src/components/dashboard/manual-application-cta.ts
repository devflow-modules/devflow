import { isOpenableJobUrl, type ApplyFlowJobSource } from "@devflow/applyflow-core";

import {
  MANUAL_APPLICATION_CTA_APPLY_FORM_LABEL,
  MANUAL_APPLICATION_CTA_ATS_JOB_LABEL,
  MANUAL_APPLICATION_CTA_LISTING_LABEL,
} from "./job-inbox-content";

const ATS_HOST_SUFFIXES = [
  "ashbyhq.com",
  "greenhouse.io",
  "lever.co",
  "workable.com",
  "jobs.lever.co",
  "boards.greenhouse.io",
  "apply.workable.com",
] as const;

const LISTING_HOST_SUFFIXES = [
  "remoteok.com",
  "remoteok.io",
  "jobgether.com",
  "linkedin.com",
  "indeed.com",
  "glassdoor.com",
] as const;

export type ManualApplicationCtaKind = "apply_form" | "ats_job" | "listing" | "unavailable";

export type ManualApplicationCta = {
  kind: ManualApplicationCtaKind;
  label: string;
  url: string | null;
};

function hostMatches(hostname: string, suffixes: readonly string[]): boolean {
  const host = hostname.toLowerCase();
  return suffixes.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}

/** Safe external job URL: http(s) only via shared core helper. */
export function isSafeExternalJobUrl(url: string | undefined): boolean {
  return isOpenableJobUrl(url);
}

/**
 * Evidence that the path/host is an apply *form*, not merely an ATS job page.
 * Deterministic and conservative — never infer from words like jobs/career alone.
 */
export function isProvenAtsApplyFormUrl(parsed: URL): boolean {
  if (!hostMatches(parsed.hostname, ATS_HOST_SUFFIXES)) return false;
  const host = parsed.hostname.toLowerCase();
  const segments = parsed.pathname
    .toLowerCase()
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);

  // Dedicated apply hosts (e.g. apply.workable.com/...).
  if (host.startsWith("apply.")) return true;

  // Explicit apply/application path segment on a known ATS host.
  if (segments.includes("apply") || segments.includes("application")) return true;

  return false;
}

/**
 * F1 CTA policy (conservative):
 * - proven ATS apply form → "Abrir formulário de candidatura"
 * - known ATS job/listing page → "Abrir vaga no portal de recrutamento"
 * - aggregator / unknown → "Abrir anúncio"
 */
export function resolveManualApplicationCta(input: {
  url?: string | null;
  source?: ApplyFlowJobSource | string | null;
}): ManualApplicationCta {
  const url = typeof input.url === "string" ? input.url.trim() : "";
  if (!url || !isSafeExternalJobUrl(url)) {
    return { kind: "unavailable", label: MANUAL_APPLICATION_CTA_LISTING_LABEL, url: null };
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { kind: "unavailable", label: MANUAL_APPLICATION_CTA_LISTING_LABEL, url: null };
  }

  if (hostMatches(parsed.hostname, ATS_HOST_SUFFIXES)) {
    if (isProvenAtsApplyFormUrl(parsed)) {
      return { kind: "apply_form", label: MANUAL_APPLICATION_CTA_APPLY_FORM_LABEL, url };
    }
    return { kind: "ats_job", label: MANUAL_APPLICATION_CTA_ATS_JOB_LABEL, url };
  }

  if (
    hostMatches(parsed.hostname, LISTING_HOST_SUFFIXES) ||
    input.source === "remoteok" ||
    input.source === "jobgether" ||
    input.source === "linkedin"
  ) {
    return { kind: "listing", label: MANUAL_APPLICATION_CTA_LISTING_LABEL, url };
  }

  // Unknown host: do not claim ATS or official form.
  return { kind: "listing", label: MANUAL_APPLICATION_CTA_LISTING_LABEL, url };
}

/**
 * Opens a validated http(s) URL in a new tab.
 * Returns false when the URL is unsafe. Does not mutate ApplyFlow state.
 * Note: browsers may return null from window.open when noopener is set; a safe
 * URL that reaches openImpl still counts as an attempted successful open.
 */
export function openManualApplicationUrl(
  url: string,
  openImpl: (url: string, target?: string, features?: string) => Window | null = (...args) =>
    window.open(...args),
): boolean {
  if (!isSafeExternalJobUrl(url)) return false;
  const opened = openImpl(url, "_blank", "noopener,noreferrer");
  if (opened) {
    try {
      opened.opener = null;
    } catch {
      /* ignore cross-origin */
    }
  }
  return true;
}
