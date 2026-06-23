import { ANPD_PRIVACY_SOURCE } from "./anpd.js";
import { GOVUK_MODERATED_USABILITY_SOURCE } from "./govuk.js";
import { INTERNAL_PILOT_RUNBOOK_SOURCE } from "./internal-runbook.js";
import { WCAG_REFERENCE_SOURCE, W3C_WAI_EVALUATION_SOURCE } from "./w3c.js";

export { ANPD_PRIVACY_SOURCE } from "./anpd.js";
export { GOVUK_MODERATED_USABILITY_SOURCE } from "./govuk.js";
export { INTERNAL_PILOT_RUNBOOK_SOURCE } from "./internal-runbook.js";
export { WCAG_REFERENCE_SOURCE, W3C_WAI_EVALUATION_SOURCE } from "./w3c.js";

export const CURATED_METHODOLOGY_SOURCES = [
  GOVUK_MODERATED_USABILITY_SOURCE,
  W3C_WAI_EVALUATION_SOURCE,
  WCAG_REFERENCE_SOURCE,
  ANPD_PRIVACY_SOURCE,
  INTERNAL_PILOT_RUNBOOK_SOURCE,
] as const;

export function listMethodologySourceIds(): string[] {
  return CURATED_METHODOLOGY_SOURCES.map((source) => source.id);
}

export function formatMethodologySourceLabels(): string[] {
  return CURATED_METHODOLOGY_SOURCES.map((source) => `${source.id}@${source.version}`);
}
