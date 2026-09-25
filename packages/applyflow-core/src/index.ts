export { gustavoProfile, CANDIDATE_PROFILE } from "./candidate-profile.js";
export type {
  CandidateProfile,
  CandidateSalary,
  CandidateSalaryKey,
  CandidateSkills,
  EnglishLevel,
  ApplyflowSkillKey,
  AnswerBank,
  CandidateFacts,
  NarrativeBank,
  RemotePreference,
  SkillYearsValue,
} from "./profile-schema.js";
export {
  APPLYFLOW_SKILL_KEYS,
  CANDIDATE_SALARY_KEYS,
  ENGLISH_LEVELS,
  candidateProfileSchema,
  declaredSkillYears,
  EMPTY_ANSWER_BANK,
  EMPTY_CANDIDATE_FACTS,
  EMPTY_CANDIDATE_SALARY,
  hasSkillKey,
  isSkillClaimed,
  isSkillKnown,
  maxDeclaredYears,
  normalizeAnswerBank,
  normalizeCandidateFacts,
  profileEnglishLevel,
  profileLocation,
  resolveSkillCanonicalKey,
  salaryField,
  validateCandidateProfile,
  validateSavableCandidateProfile,
} from "./profile-schema.js";
export type { CandidateProfileDraft, ProfileDraftSkill } from "./profile-draft.js";
export {
  candidateProfileFromDraft,
  draftFromCandidateProfile,
  emptyCandidateProfileDraft,
} from "./profile-draft.js";
export { getSuggestedAnswer } from "./answer-rules.js";
export { getSalarySuggestion } from "./salary-rules.js";
export { calculateFitScore } from "./fit-score.js";
export { evaluateJobDecisionV2, incompleteAnalysisFacts, JOB_DECISION_SCORING_VERSION_V2 } from "./evaluate-job-decision-v2.js";
export { mapV2DecisionToInbox, presentInboxJobAnalysis } from "./inbox-analysis-presentation.js";
export type { InboxJobAnalysisPresentation } from "./inbox-analysis-presentation.js";
export { extractJobRequirements } from "./extract-job-requirements.js";
export { documentedYearsFromEvidence, matchRequirementsToEvidence, yearsDeclaredInEvidence } from "./evidence-matching.js";
export {
  auditClaim,
  auditClaims,
  recommendedClaims,
  buildClaimAuditResult,
  sanitizeTextWithClaimAudit,
  splitTextClaims,
} from "./claim-safety.js";
export type { ClaimAuditResult } from "./claim-safety.js";
export { APPLICATION_GATE_RESULTS, evaluateApplicationGates, hasFailingRequiredGate } from "./application-gates.js";
export { buildCandidateInputRequests } from "./candidate-input.js";
export { evidenceFromProfile, buildCandidateEvidence } from "./evidence-from-profile.js";
export { gustavoEvidenceSeed } from "./evidence-seed.js";
export { parseEvidence, parseEvidenceLibrary, mergeEvidenceLibraries, normalizeEvidence } from "./evidence-schema.js";
export {
  APPLYFLOW_PIPELINE_STATUS_V2,
  APPLYFLOW_PIPELINE_STATUS_V2_LABELS_PT,
  coerceImportedApplicationStatus,
  fromPipelineStatusV2,
  isApplyFlowApplicationStatusV1,
  isApplyFlowPipelineStatusV2,
  toPipelineStatusV2,
} from "./pipeline-status.js";
export { REQUIREMENT_IMPORTANCE_WEIGHTS } from "./job-requirement-types.js";
export type {
  Evidence,
  EvidenceConfidence,
  EvidenceDstPolicy,
  EvidenceKind,
  EvidenceLibrary,
  EvidenceOrigin,
  EvidenceScheduleWindow,
  EvidenceSource,
  EvidenceStance,
  EvidenceSubject,
} from "./evidence-types.js";
export {
  EVIDENCE_CONFIDENCE,
  EVIDENCE_DST_POLICIES,
  EVIDENCE_KINDS,
  EVIDENCE_ORIGINS,
  EVIDENCE_SOURCES,
  EVIDENCE_STANCES,
  EVIDENCE_SUBJECTS,
} from "./evidence-types.js";
export {
  RECORDED_FACT_TOPICS,
  SUPABASE_COMPONENT_LABELS,
  SUPABASE_COMPONENT_TOPICS,
  assertWritableRecordedFacts,
  buildRecordedFact,
  documentedYearsFromMonths,
  inclusiveMonthCount,
  parseRecordedFacts,
  unionDocumentedMonths,
  yearMonthFromDate,
} from "./recorded-facts.js";
export type { MonthRange, RecordedFactInput, RecordedFactTopic, SupabaseComponentTopic } from "./recorded-facts.js";
export type {
  JobRequirement,
  JobRequirementCategory,
  JobRequirementImportance,
  JobRequirementType,
} from "./job-requirement-types.js";
export type { EvidenceMatch, EvidenceMatchStatus } from "./evidence-matching.js";
export type { ClaimAudit, ClaimSafety } from "./claim-safety.js";
export {
  APPLICATION_DECISIONS,
  INCOMPLETE_ANALYSIS_MESSAGE,
  isInconclusiveDecision,
  isRecommendedApplyDecision,
} from "./application-decision-types.js";
export type {
  ApplicationCost,
  ApplicationDecision,
  CareerUpside,
  DecisionAxis,
  EliminationRisk,
  FitDimensionsV2,
  HiringProbability,
  JobDecisionV2,
  OpportunityCost,
} from "./application-decision-types.js";
export type { ApplicationGate, ApplicationGateResult, ApplicationGateType } from "./application-gates.js";
export type {
  CandidateInputExpectedType,
  CandidateInputRequest,
  CandidateInputStatus,
} from "./candidate-input.js";
export type { ApplyFlowPipelineStatusV2 } from "./pipeline-status.js";
export type { Confidence, FitScoreResult, SalaryContext, SalarySuggestion, SuggestedAnswer, SuggestionSource } from "./types.js";
export {
  extractCompensationMention,
  extractEnglishBar,
  extractJobIntelligence,
  extractMentionedLocations,
  extractScheduleWindow,
  locationMentionsMatch,
  normalizeJobTextForIntel,
} from "./job-intelligence.js";
export type {
  JobCompensationMention,
  JobCompensationPeriodicity,
  JobContractType,
  JobEnglishBar,
  JobIntelligence,
  JobRoleType,
  JobScheduleWindow,
  JobSeniority,
  JobWorkModel,
} from "./job-intelligence.js";
export { buildAiPrompt } from "./ai-prompt-builder.js";
export type { AiPromptInput, AiTextTask } from "./ai-prompt-builder.js";
export type {
  ApplyFlowApplication,
  ApplyFlowApplicationSource,
  ApplyFlowApplicationStatus,
  ApplyFlowJobMeta,
  ApplyFlowPreparationStatusSnapshot,
  CopilotHistoryDecision,
  SaveApplicationInput,
} from "./application-types.js";
export { APPLYFLOW_APPLICATION_STATUS_LABELS_PT } from "./application-types.js";
export {
  computeApplicationMetrics,
  getApplicationsByPeriod,
  getPeriodCreatedAtFloor,
  APPLICATION_STALE_STATUSES,
  isApplicationStale7d,
} from "./application-metrics.js";
export type { ApplicationMetrics, ApplicationsPeriodFilter } from "./application-metrics.js";
export { parseApplyFlowApplicationsImport, parseApplyFlowImportJsonString } from "./imported-application-schema.js";
export type { ParsedApplyFlowImportResult } from "./imported-application-schema.js";
export { evaluateJobMatch, profileSkillLabels } from "./evaluate-job-match.js";
export {
  JOB_MATCH_THRESHOLDS_V1,
  decideJobMatchV1,
  decideJobMatchV1WithCoverage,
  statusFromJobMatchDecision,
} from "./job-match-thresholds.js";
export {
  CURRICULUM_ROUTER_CONFIDENCE,
  CURRICULUM_ROUTER_DELTA_BANDS_V1,
  CURRICULUM_ROUTER_VERSION,
  JOB_MATCH_SCORING_VERSION,
} from "./job-match-types.js";
export type {
  ApplyFlowJob,
  ApplyFlowJobContext,
  ApplyFlowJobEvaluatedWith,
  ApplyFlowJobMatch,
  ApplyFlowJobSource,
  CurriculumRecommendation,
  CurriculumRouterConfidence,
  CurriculumRouterVersion,
  JobMatchDecision,
  JobMatchScoringVersion,
  NormalizedJobSkills,
  ResumeMatchCandidate,
} from "./job-match-types.js";
export {
  classifyCurriculumRouterConfidence,
  compareResumeMatchCandidates,
  rankResumeMatchCandidates,
  recommendCurriculum,
} from "./curriculum-router.js";
export {
  JOB_DESCRIPTION_SNAPSHOT_MAX_CHARS,
  hashJobDescription,
  snapshotJobDescription,
} from "./job-description-snapshot.js";
export {
  createApplyFlowJobId,
  ingestApplyFlowJob,
  isJobMatchStale,
  projectJobForFunnel,
  reevaluateApplyFlowJobMatch,
  reevaluateApplyFlowJobs,
} from "./ingest-applyflow-job.js";
export type { IngestApplyFlowJobInput } from "./ingest-applyflow-job.js";
export { mergeApplyFlowJobs } from "./merge-applyflow-jobs.js";
export { canonicalizeJobUrl, findJobByCanonicalUrl } from "./job-url-identity.js";
export {
  APPLICATION_PACK_CHECKLIST_IDS,
  APPLICATION_PACK_SCHEMA_VERSION,
  APPLICATION_PACK_VERSION,
} from "./application-pack-types.js";
export type {
  ApplicationPack,
  ApplicationPackCandidateFacts,
  ApplicationPackChecklistId,
  ApplicationPackChecklistItem,
  ApplicationPackMatchSnapshot,
  ApplicationPackResumeRef,
  ApplicationPackResumeSource,
  ApplicationPackVersion,
} from "./application-pack-types.js";
export {
  canCreateApplicationPack,
  isV1TechnicalApplyOrStretch,
  createApplicationPack,
  isOpenableJobUrl,
  markApplyFlowJobApplied,
  replaceApplyFlowJob,
  resolveApplicationPackResume,
  setApplicationPackChecklistItem,
  snapshotCandidateFacts,
} from "./application-pack.js";
export type { ApplicationPackOpResult } from "./application-pack.js";
export {
  applyFlowStoredJobSchema,
  isApplyFlowJobsImportV2,
  parseApplyFlowJobsImport,
  parseApplyFlowJobsImportJsonString,
  parseStoredApplyFlowJob,
} from "./imported-job-schema.js";
export type { ParsedApplyFlowJobsImportResult } from "./imported-job-schema.js";
export { parseApplyFlowDashboardImportJsonString } from "./imported-dashboard-schema.js";
export type { ParsedApplyFlowDashboardImport } from "./imported-dashboard-schema.js";
export { computeCopilotJobMatch, decideCopilotJobMatch, splitRequiredPreferredSkills, COPILOT_JOB_MATCH_VERSION, COPILOT_MATCH_THRESHOLDS } from "./copilot-job-match.js";
export type { CopilotJobMatchDecision, CopilotRoleFit, JobMatchResult, SplitJobSkills } from "./copilot-job-match.js";
export {
  recommendResumeTrack,
  RESUME_TRACKS,
  RESUME_TRACK_LABELS_PT,
} from "./resume-track-router.js";
export type { ResumeRecommendation, ResumeTrack, ResumeTrackConfidence } from "./resume-track-router.js";
export {
  prepareApplication,
  prepareField,
  summarizePreparedFields,
  isBlockedNavigationClassification,
  copilotSnapshotForHistory,
} from "./application-preparation.js";
export type {
  ApplicationPreparation,
  ApplicationPreparationSummary,
  PreparedField,
  PreparedFieldSource,
  PreparedFieldStatus,
  PreparationFieldInput,
} from "./application-preparation.js";
export {
  LEGACY_RESUME_VARIANT_ID,
  LEGACY_RESUME_VARIANT_NAME,
  RESUME_LIBRARY_IMPORT_KIND,
  RESUME_LIBRARY_SCHEMA_VERSION,
} from "./resume-library-types.js";
export type { ResumeLibrary, ResumeVariant, ResumeVariantSource } from "./resume-library-types.js";
export {
  addResumeVariant,
  updateResumeVariant,
  createResumeLibraryFromProfile,
  createResumeVariantId,
  deleteResumeVariant,
  duplicateResumeVariant,
  getDefaultResumeVariant,
  renameResumeVariant,
  setDefaultResumeVariant,
} from "./resume-library.js";
export type { ResumeLibraryOpResult } from "./resume-library.js";
export { isResumeLibraryImportV1, looksLikeCandidateProfile, parseResumeLibrary } from "./resume-library-schema.js";
export { ensureResumeLibrary } from "./migrate-resume-library.js";
export type { EnsureResumeLibraryResult } from "./migrate-resume-library.js";
export { parseResumeLibraryImport, serializeResumeLibraryImport } from "./imported-resume-library-schema.js";
export type { ParsedResumeLibraryImport } from "./imported-resume-library-schema.js";
export { recommendResumeV2, forbiddenKeywordsFromDecision, isApplyDecision, RESUME_STRATEGIES_V2 } from "./resume-router-v2.js";
export type { ResumeRecommendationV2, ResumeStrategyV2 } from "./resume-router-v2.js";
export { buildCvPersonalizationPlan } from "./cv-personalization.js";
export type { CvChange, CvPersonalizationPlan } from "./cv-personalization.js";
export { generateApplicationAnswers, APPLICATION_ANSWER_TYPES, APPLICATION_ANSWER_STATUSES } from "./application-answers-v2.js";
export type { ApplicationAnswer, ApplicationAnswerStatus, ApplicationAnswerType } from "./application-answers-v2.js";
export { recommendBinaryAnswer, applyBinaryKnockouts } from "./binary-answers.js";
export type { BinaryAnswer, BinaryAnswerRecommendation } from "./binary-answers.js";
export { recommendCompensation } from "./compensation.js";
export type { CompensationRecommendation } from "./compensation.js";
export {
  CONTACT_TYPES,
  CONTACT_STATUSES,
  CONTACT_INTERACTION_TYPES,
  OUTREACH_CHANNELS,
  OUTREACH_LANGUAGES,
  OUTREACH_STATUSES,
} from "./contact-types.js";
export type {
  Contact,
  ContactInteraction,
  ContactStatus,
  ContactType,
  ContactInteractionType,
  OutreachChannel,
  OutreachLanguage,
  OutreachStatus,
} from "./contact-types.js";
export {
  computeOutreachMetrics,
  effectiveOutreachStatus,
  isOutreachFollowUpDue,
  markOutreachSent,
  normalizeOutreachStatus,
  recordOutreachReply,
  updateOutreachContact,
  validateOutreachProfileUrl,
} from "./outreach-lifecycle.js";
export type { OutreachContactPatch, OutreachMetrics } from "./outreach-lifecycle.js";
export { buildNetworkingPlan, sortContactsForPlan } from "./networking-plan.js";
export type { NetworkingPlan } from "./networking-plan.js";
export { buildFollowUpPlan, DEFAULT_FOLLOW_UP_STRATEGY, FOLLOW_UP_ACTIONS } from "./follow-up-plan.js";
export type { FollowUpPlan, FollowUpStep, FollowUpStrategy, FollowUpAction } from "./follow-up-plan.js";
export { getDueFollowUps, groupDueFollowUps } from "./follow-up-queue.js";
export type { DueFollowUp, DueFollowUpBucket } from "./follow-up-queue.js";
export { recommendCases } from "./case-match.js";
export type { CaseRecommendation } from "./case-match.js";
export { buildInterviewBrief } from "./interview-brief.js";
export type { InterviewBrief } from "./interview-brief.js";
export { createApplicationPackV2, canCreateApplicationPackV2, APPLICATION_PACK_V2_VERSION } from "./application-pack-v2.js";
export type { ApplicationPackV2, ApplicationPackV2Status } from "./application-pack-v2.js";
export { attachApplicationV2Meta, applicationMetaFromDecision, stripApplicationV2Meta } from "./application-record-v2.js";
export type { ApplyFlowApplicationV2Envelope, ApplyFlowApplicationV2Meta } from "./application-record-v2.js";
export {
  createApplyFlowCareerBundleV2,
  serializeApplyFlowCareerBundleV2,
  parseApplyFlowCareerBundle,
  parseApplyFlowCareerBundleJsonString,
  buildInterviewLabSidecarV2,
  extractInterviewLabSidecarV2,
  isApplyFlowCareerBundleV2,
  APPLYFLOW_CAREER_BUNDLE_V2_VERSION,
} from "./career-bundle-v2.js";
export type { ApplyFlowCareerBundleV2, ApplyFlowInterviewLabSidecarV2, ParsedApplyFlowCareerBundle } from "./career-bundle-v2.js";
export {
  computeFunnelMetrics,
  computeFitBandPerformance,
  computeRolePerformance,
  computeSourcePerformance,
  computeResumePerformance,
  computeNetworkingPerformance,
  computeGapFrequency,
  computeGapOutcomeAssociation,
  computeEvidenceUsage,
  computeCaseUsage,
  computePriorityPerformance,
  computeEffortMetrics,
  historicalDecisionsFromSnapshots,
} from "./career-analytics.js";
export type {
  FunnelMetrics,
  FitBandPerformance,
  RolePerformance,
  SourcePerformance,
  ResumePerformance,
  NetworkingCohort,
  GapFrequency,
  GapOutcomeAssociation,
  EvidenceUsage,
  CaseUsage,
  PriorityPerformance,
  EffortMetrics,
} from "./career-analytics.js";
export {
  emptyOutcome,
  mergeOutcome,
  applySnapshotToOutcome,
  outcomeFromApplication,
  applyCareerFeedback,
  resolvedRejection,
} from "./application-outcome.js";
export {
  captureApplicationDecisionSnapshot,
  parseApplicationDecisionSnapshot,
  evidenceIdsFromApplicationPackV2,
  caseIdsFromApplicationPackV2,
} from "./application-decision-snapshot.js";
export type { ApplicationDecisionSnapshot, ApplicationRequirementSnapshot } from "./application-decision-snapshot.js";
export {
  findApplicationForJob,
  createApplicationFromJob,
  createApplicationId,
  markApplicationSubmitted,
  canRecordApplicationOutcome,
  outcomeBelongsToApplication,
  applicationSourceFromJob,
} from "./application-identity.js";
export {
  APPLICATION_LIFECYCLE_TRANSITIONS,
  analysisAtApplyFromOutcome,
  analysesDiverge,
  backfillClosedLoopV1,
  canTransitionApplicationStatus,
  formatLifecycleEventDate,
  getApplicationLifecycleView,
  lifecycleEventId,
  resolvePipelineStatus,
  transitionApplicationStatus,
} from "./application-lifecycle.js";
export type {
  AnalysisAtApply,
  ApplicationLifecycleView,
  CurrentAnalysisView,
  TransitionApplicationStatusInput,
  TransitionApplicationStatusResult,
} from "./application-lifecycle.js";
export {
  INBOUND_DETECTION_STATES,
  INBOUND_DISCARD_REASONS,
  INBOUND_MATCH_STATUSES,
  INBOUND_RESPONSE_AUTO_APPLY,
  INBOUND_RESPONSE_KIND_LABELS_PT,
  INBOUND_RESPONSE_KINDS,
  analyzeInboundResponses,
  applicationStatusForMatching,
  atsRootDomain,
  buildInboundStatusTransitionProposals,
  classifyInboundResponse,
  companyMatchTokens,
  detectInboundResponses,
  domainMatchesCompany,
  formatInboundConfirmationNotes,
  hostnameFromJobUrl,
  inboundEmailFromLocalEvidence,
  inboundEmailHasText,
  inboundResponseHeadline,
  inboundSignalFromLocalEvidence,
  isAtsDomain,
  isJobAlertInbound,
  isPublicMailDomain,
  isSharedRecruitingHost,
  previewInboundResponseAnalysis,
  summarizeInboundResponseAnalysis,
  markResponseDetectionConfirmed,
  markResponseDetectionDismissed,
  matchInboundEmailToApplications,
  matchInboundSignalToApplications,
  mergeInboundResponseDetections,
  normalizeInboundDomain,
  prepareResponseDetectionConfirmation,
  suggestedStatusForInboundKind,
} from "./inbound-application-response.js";
export type {
  InboundDetectionState,
  InboundDiscardReason,
  InboundEmail,
  InboundMatchStatus,
  InboundResponseAnalysis,
  InboundResponseAnalysisDecision,
  InboundResponseAnalysisPreview,
  InboundResponseAnalysisSummary,
  InboundResponseEvidence,
  InboundResponseKind,
  InboundResponseMatchBasis,
  InboundResponseSignalInput,
  InboundStatusTransitionProposal,
  MatchableInboundApplication,
  ResponseDetection,
} from "./inbound-application-response.js";
export { confidenceFromSampleSize, comparisonConfidence, safeRate, fitBandFor, priorityBandFor } from "./analytics-confidence.js";
export { normalizeCareerSource, normalizeRoleFamily, normalizeRequirementKey } from "./career-analytics-normalize.js";
export { generateCareerInsights, insightUsesCausalLanguage } from "./career-insights.js";
export { buildCareerScorecard, computeWeeklyOperatingMetrics } from "./career-scorecard.js";
export type { CareerScorecard, WeeklyOperatingMetrics } from "./career-scorecard.js";
export { computeGapMap, GAP_MAP_ACTIONS } from "./gap-map.js";
export type { GapMapEntry, GapMapAction } from "./gap-map.js";
export { CAREER_SOURCES, CAREER_EVENT_TYPES, APPLICATION_LIFECYCLE_SOURCES, REJECTION_REASON_CATEGORIES, OBSERVED_ASSOCIATION_DISCLAIMER } from "./career-analytics-types.js";
export type {
  ApplicationOutcome,
  ApplicationCareerEvent,
  ApplicationEffort,
  CareerAnalyticsInput,
  CareerInsight,
  CareerSource,
  CareerFeedbackAction,
  HistoricalDecisionRecord,
  RejectionReasonCategory,
  ApplicationLifecycleSource,
} from "./career-analytics-types.js";
export type { DashboardImportSummary, DashboardStoredImport, DashboardTableFilters } from "./dashboard-types.js";
export {
  applyDashboardTableFilters,
  bucketApplicationsByWeek,
  countStaleApplications,
  filterApplicationsByContract,
  filterApplicationsByEnglishRequired,
  filterApplicationsByPeriod,
  filterApplicationsBySkill,
  filterApplicationsByStatus,
  filterApplicationsByWorkModel,
  collectDetectedSkills,
  computeCreatedAtRange,
  FUNNEL_STATUS_ORDER,
} from "./dashboard-filters.js";
