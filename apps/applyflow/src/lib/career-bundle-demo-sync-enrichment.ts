import type { CareerBundleUnifiedSyncEnrichment } from "@devflow/career-core";
import {
  buildCareerBundleCalendarEnrichment,
  buildCareerBundleGmailEnrichment,
  buildCareerBundleSyncEnrichment,
  buildCalendarSyncPreview,
  buildGmailSyncPreview,
  sampleInterviewCalendarEvent,
  sampleInterviewInviteEmail,
  sampleRecruiterEmail,
  sampleTechnicalCalendarEvent,
} from "@devflow/career-sync";

const APPLYFLOW_DEMO_SYNC_DEFAULT_NOW = "2026-06-09T12:00:00.000Z";

export type BuildApplyFlowDemoSyncEnrichmentOptions = {
  generatedAt?: string;
  now?: string;
};

/**
 * Sandbox/demo sync enrichment for ApplyFlow opt-in export only.
 * Uses @devflow/career-sync fixtures — no OAuth, no provider calls, no real PII.
 */
export function buildApplyFlowDemoSyncEnrichment(
  options?: BuildApplyFlowDemoSyncEnrichmentOptions,
): CareerBundleUnifiedSyncEnrichment {
  const now = options?.now ?? options?.generatedAt ?? APPLYFLOW_DEMO_SYNC_DEFAULT_NOW;
  const generatedAt = options?.generatedAt ?? now;

  const gmailPreview = buildGmailSyncPreview({
    messages: [sampleRecruiterEmail, sampleInterviewInviteEmail],
  });
  const calendarPreview = buildCalendarSyncPreview(
    { events: [sampleInterviewCalendarEvent, sampleTechnicalCalendarEvent] },
    { now },
  );
  const gmail = buildCareerBundleGmailEnrichment(gmailPreview.signals, { generatedAt });
  const calendar = buildCareerBundleCalendarEnrichment(calendarPreview.signals, { generatedAt });

  return buildCareerBundleSyncEnrichment({ gmail, calendar }, { now, generatedAt });
}
