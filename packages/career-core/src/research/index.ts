export {
  affectedFlowSchema,
  confidenceLevelSchema,
  curatorModeSchema,
  findingSeveritySchema,
  moderatorAssistInputSchema,
  observationTypeSchema,
  parsePilotCuratorRequest,
  pilotCuratorRequestSchema,
  pilotCuratorResponseSchema,
  pilotDecisionSchema,
  pilotFindingSchema,
  pilotObservationSchema,
  pilotSummarySchema,
  pilotTaskCompletionSchema,
  prepareSessionInputSchema,
  prepareSessionOutputSchema,
} from "./curator-contracts.js";

export type {
  AffectedFlow,
  ConfidenceLevel,
  CuratorMode,
  FindingSeverity,
  ModeratorAssistInput,
  ModeratorAssistOutput,
  ObservationType,
  PilotCuratorRequest,
  PilotCuratorResponse,
  PilotDecision,
  PilotFinding,
  PilotObservation,
  PilotSummary,
  PilotTaskCompletion,
  PrepareSessionInput,
  PrepareSessionOutput,
} from "./curator-contracts.js";

export { runCareerPilotCurator, runPilotCurator } from "./curator-agent.js";
export {
  buildParticipantFrequencyLabel,
  mapDecisionToGithubLabel,
  recommendPilotDecision,
} from "./decision-engine.js";
export { mergeObservations, structurePilotNotes } from "./evidence-normalizer.js";
export {
  classifyFindings,
  classifyObservations,
  countFindingsBySeverity,
  resetFindingCounterForTests,
} from "./finding-classifier.js";
export {
  sanitizeGithubCommentDraft,
  sanitizePilotContent,
  sanitizePilotText,
  sanitizePilotTextList,
} from "./privacy-sanitizer.js";
export { PILOT_CONTENT_MAX_BYTES } from "./privacy-sanitizer.js";
export {
  ANPD_PRIVACY_SOURCE,
  CURATED_METHODOLOGY_SOURCES,
  GOVUK_MODERATED_USABILITY_SOURCE,
  INTERNAL_PILOT_RUNBOOK_SOURCE,
  listMethodologySourceIds,
  formatMethodologySourceLabels,
  WCAG_REFERENCE_SOURCE,
  W3C_WAI_EVALUATION_SOURCE,
} from "./sources/index.js";

export const CAREER_PILOT_CURATOR_ROLE = "MODERATOR SUPPORT TOOL" as const;

export const CAREER_PILOT_CURATOR_VERSION = "1.0.0" as const;
