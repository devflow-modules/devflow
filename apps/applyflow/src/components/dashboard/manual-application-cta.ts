import { isOpenableJobUrl, type ApplyFlowJobSource } from "@devflow/applyflow-core";

import {
  MANUAL_APPLICATION_CTA_LISTING_LABEL,
  MANUAL_APPLICATION_CTA_OFFICIAL_LABEL,
} from "./job-inbox-content";

const OFFICIAL_APPLY_HOST_SUFFIXES = [
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

export type ManualApplicationCtaKind = "official" | "listing" | "unavailable";

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
 * F1 CTA policy: only claim "site oficial" for known ATS hosts.
 * Aggregator/listing hosts (and unknown hosts) use listing wording.
 */
export function resolveManualApplicationCta(input: {
  url?: string | null;
  source?: ApplyFlowJobSource | string | null;
}): ManualApplicationCta {
  const url = typeof input.url === "string" ? input.url.trim() : "";
  if (!url || !isSafeExternalJobUrl(url)) {
    return { kind: "unavailable", label: MANUAL_APPLICATION_CTA_LISTING_LABEL, url: null };
  }
  let hostname = "";
  try {
    hostname = new URL(url).hostname;
  } catch {
    return { kind: "unavailable", label: MANUAL_APPLICATION_CTA_LISTING_LABEL, url: null };
  }

  if (hostMatches(hostname, OFFICIAL_APPLY_HOST_SUFFIXES)) {
    return { kind: "official", label: MANUAL_APPLICATION_CTA_OFFICIAL_LABEL, url };
  }

  if (
    hostMatches(hostname, LISTING_HOST_SUFFIXES) ||
    input.source === "remoteok" ||
    input.source === "jobgether" ||
    input.source === "linkedin"
  ) {
    return { kind: "listing", label: MANUAL_APPLICATION_CTA_LISTING_LABEL, url };
  }

  // Unknown host: do not claim official ATS — treat as listing/opportunity link.
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
