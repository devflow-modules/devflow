"use client";

import { CareerPilotExperience } from "@/components/dashboard/career-pilot-experience";
import { isCareerPilotModeClient } from "@/lib/career-system/feature-flags";
import { ApplyFlowBadge, type ApplyFlowBadgeTone } from "@/components/ui/ApplyFlowBadge";
import { ApplyFlowButton, applyFlowButtonClass } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import { ApplyFlowEmptyState } from "@/components/ui/ApplyFlowEmptyState";
import { ApplyFlowPrivacyNotice } from "@/components/ui/ApplyFlowPrivacyNotice";
import { ApplyFlowSection } from "@/components/ui/ApplyFlowSection";
import Link from "next/link";

import { JobInboxPanel } from "@/components/dashboard/job-inbox-panel";
import { JOB_INBOX_NEEDS_RESUME } from "@/components/dashboard/job-inbox-content";
import { ResumeLibraryPanel } from "@/components/dashboard/resume-library-panel";
import { DashboardJobUrlCell } from "@/components/dashboard/dashboard-job-url-cell";
import { InboundApplicationResponsePanel } from "@/components/dashboard/inbound-application-response-panel";
import { ProviderConsentConfirmationPanel } from "@/components/dashboard/provider-consent-confirmation-panel";
import {
  shouldShowInterviewLabExport,
  shouldShowProviderConsentOnDashboard,
} from "@/components/dashboard/dashboard-lab-surfaces";
import { DashboardNextStep } from "@/components/dashboard/dashboard-next-step";
import {
  DASHBOARD_ANALYTICS_HINT,
  DASHBOARD_APPLICATIONS_DESCRIPTION,
  DASHBOARD_APPLICATIONS_TITLE,
  DASHBOARD_DATA_DESCRIPTION,
  DASHBOARD_DATA_TITLE,
  DASHBOARD_PREPARE_INTERVIEW,
  DASHBOARD_PREPARE_INTERVIEW_HINT,
  DASHBOARD_OPEN_INTERVIEW_LAB_HINT,
  DASHBOARD_MARK_SENT,
} from "@/components/dashboard/dashboard-work-content";
import {
  dashboardAnalyzeHref,
  dashboardNextStepId,
  dashboardWorkFlags,
  shouldShowApplicationsList,
} from "@/components/dashboard/dashboard-work-state";
import {
  JobsStorageRecoveryBanner,
  ResumeLibraryRecoveryBanner,
} from "@/components/dashboard/dashboard-storage-recovery";
import { resolveInboxMatchProfile } from "@/lib/resolve-inbox-match-profile";
import {
  APPLYFLOW_APPLICATION_STATUS_LABELS_PT,
  applyDashboardTableFilters,
  collectDetectedSkills,
  computeCreatedAtRange,
  ingestApplyFlowJob,
  findJobByCanonicalUrl,
  reevaluateApplyFlowJobMatch,
  reevaluateApplyFlowJobs,
  mergeApplyFlowJobs,
  parseApplyFlowDashboardImportJsonString,
  parseApplyFlowImportJsonString,
  stripApplicationV2Meta,
  createApplicationPack,
  findApplicationForJob,
  markApplyFlowJobApplied,
  replaceApplyFlowJob,
  setApplicationPackChecklistItem,
  addResumeVariant,
  updateResumeVariant,
  createResumeLibraryFromProfile,
  validateSavableCandidateProfile,
  deleteResumeVariant,
  duplicateResumeVariant,
  getDefaultResumeVariant,
  renameResumeVariant,
  setDefaultResumeVariant,
  type ApplyFlowApplication,
  type ApplyFlowApplicationStatus,
  type ApplyFlowApplicationV2Envelope,
  type ApplyFlowJob,
  type ApplicationPackChecklistId,
  type DashboardTableFilters,
  type ResumeLibrary,
} from "@devflow/applyflow-core";
import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from "react";
import type { ReactNode } from "react";

import { DEMO_APPLICATIONS_PUBLIC_PATH } from "@/lib/demo-dataset";
import {
  clearPersistedDashboardImport,
  loadDashboardImport,
  persistDashboardImport,
} from "@/lib/local-import-storage";
import { persistApplicationSubmitted, persistClosedLoopV1Backfill } from "@/lib/persist-application-decision";
import {
  clearPersistedDashboardJobs,
  loadDashboardJobs,
  persistDashboardJobs,
  type DashboardJobsLoadStatus,
  type DashboardJobsUnreadableReason,
} from "@/lib/local-job-storage";
import {
  DashboardPersistenceNotice,
  V2_LOCAL_IMPORT_BLOCKED,
  dashboardPersistenceFailureMessage,
} from "@/components/dashboard/dashboard-persistence-notice";
import type { ApplyFlowDashboardPersistence } from "@/lib/persistence-v2/dashboard/dashboard-persistence";
import { openDashboardPersistence } from "@/lib/persistence-v2/dashboard/open-dashboard-persistence";
import {
  clearPersistedResumeLibrary,
  hydrateResumeLibraryState,
  persistResumeLibrary,
  type ResumeLibraryLoadStatus,
} from "@/lib/local-resume-library-storage";
import { persistDashboardContacts } from "@/lib/local-contact-storage";
import { loadDashboardAnalytics, persistDashboardAnalytics } from "@/lib/local-analytics-storage";
import {
  buildInterviewLabCareerBundle,
  buildInterviewLabCareerBundleForExport,
  buildSingleRowCareerBundleForInterviewLab,
  downloadCareerBundleJson,
  mapApplyFlowApplicationToCareer,
  stringifyInterviewLabCareerBundleExport,
} from "@/lib/career-bundle-export";
import { deriveDashboardCareerBundleExportComposition } from "@/lib/derive-dashboard-career-bundle-export-composition";
import { DashboardCareerExportCompositionSource } from "@/components/dashboard/dashboard-career-export-composition-source";
import { DASHBOARD_CAREER_EXPORT_READ_ONLY_NOTICE } from "@/components/dashboard/dashboard-career-export-content";
import type { CareerBundleUnifiedSyncEnrichment } from "@devflow/career-sync";
import { sendCareerBundleViaPostMessageWithRetry } from "@/lib/career-bundle-postmessage-handoff";
import {
  copyCareerBundleJsonToClipboard,
  getInterviewLabImportHandoffUrl,
  getInterviewLabImportPostMessagePracticeHandoffUrl,
  stringifyCareerBundleJson,
} from "@/lib/interview-lab-handoff";
import { cn } from "@/lib/cn";
import { createCareerBundle, getInterviewReadyApplications } from "@devflow/career-core";
import { CAREER_ANALYTICS_LINK } from "@/components/dashboard/career-analytics-content";

const defaultFilters: DashboardTableFilters = {
  period: "all",
  status: "all",
  skill: "",
  workModel: "all",
  contractType: "all",
  englishRequired: "all",
};

type FeedbackKind = "import" | "jobs" | "demo" | "restored";

type ImportFeedback = {
  loaded: number;
  ignored: number;
  kind: FeedbackKind;
};

function statusTone(status: ApplyFlowApplicationStatus): ApplyFlowBadgeTone {
  switch (status) {
    case "accepted":
    case "hired":
      return "success";
    case "rejected":
    case "ignored":
      return "danger";
    case "interview":
      return "brand";
    case "technical_test":
      return "intel";
    case "waiting_response":
      return "warning";
    case "applied":
      return "neutral";
    default:
      return "neutral";
  }
}

const filterSelectClass = cn(
  "min-w-[130px] grow rounded-[var(--af-radius-sm)] border border-[color:var(--af-border-strong)]",
  "bg-[color:var(--af-bg-soft)] px-3 py-2.5 text-sm text-[color:var(--af-text)]",
  "focus:border-emerald-500/50 focus:outline-none",
);

function feedbackSummary(f: ImportFeedback | null): ReactNode {
  if (!f) return null;

  if (f.kind === "demo") {
    return (
      <>
        <strong className="text-emerald-300">Demo carregada</strong> com {f.loaded} candidaturas fictícias (apenas para
        demonstração).
        {f.ignored > 0 ? ` · ${f.ignored} linhas ignoradas` : null}
      </>
    );
  }
  if (f.kind === "import") {
    return (
      <>
        <strong className="text-emerald-300">Dados importados:</strong> {f.loaded} candidaturas
        {f.ignored > 0 ? ` · ${f.ignored} registos ignorados (formato inválido)` : null}
      </>
    );
  }
  if (f.kind === "jobs") {
    return (
      <>
        <strong className="text-emerald-300">Vagas avaliadas:</strong> {f.loaded} no inbox
        {f.ignored > 0 ? ` · ${f.ignored} ignoradas (duplicado ou inválido)` : null}
      </>
    );
  }
  return (
    <>
      <strong className="text-emerald-300">Dados restaurados</strong> deste navegador: {f.loaded} candidaturas.
    </>
  );
}

export function DashboardClient({
  gmailRuntimeEnabled = false,
  persistenceV2Enabled = false,
}: {
  gmailRuntimeEnabled?: boolean;
  persistenceV2Enabled?: boolean;
} = {}) {
  const [applications, setApplications] = useState<ApplyFlowApplicationV2Envelope[]>([]);
  const [jobs, setJobs] = useState<ApplyFlowJob[]>([]);
  const [resumeLibrary, setResumeLibrary] = useState<ResumeLibrary | null>(null);
  const [resumeLibraryError, setResumeLibraryError] = useState<string | null>(null);
  const [resumeLibraryStatus, setResumeLibraryStatus] = useState<ResumeLibraryLoadStatus>("empty");
  const [jobInboxError, setJobInboxError] = useState<string | null>(null);
  const [jobsStorageStatus, setJobsStorageStatus] = useState<DashboardJobsLoadStatus>("empty");
  const [jobsIgnoredCount, setJobsIgnoredCount] = useState(0);
  const [jobsUnreadableReason, setJobsUnreadableReason] = useState<DashboardJobsUnreadableReason | undefined>(
    undefined,
  );
  const [hydrated, setHydrated] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importFeedback, setImportFeedback] = useState<ImportFeedback | null>(null);
  const [filters, setFilters] = useState<DashboardTableFilters>(defaultFilters);
  const [dragOver, setDragOver] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [remoteGate, setRemoteGate] = useState<"migration_required" | "auth_required" | "error" | null>(null);
  const persistenceRef = useRef<ApplyFlowDashboardPersistence | null>(null);

  useEffect(() => {
    if (persistenceV2Enabled) {
      let cancelled = false;
      void openDashboardPersistence({ persistenceV2Enabled: true }).then((opened) => {
        if (cancelled) return;
        if (opened.kind === "ready") {
          persistenceRef.current = opened.persistence;
          setJobs(opened.jobs);
          setApplications(opened.applications);
          setRemoteGate(null);
          setHydrated(true);
          return;
        }
        persistenceRef.current = null;
        if (opened.kind === "migration_required") setRemoteGate("migration_required");
        else if (opened.kind === "auth_required") setRemoteGate("auth_required");
        else if (opened.kind === "error") setRemoteGate("error");
        setHydrated(true);
      });
      return () => {
        cancelled = true;
      };
    }

    persistClosedLoopV1Backfill();
    const stored = loadDashboardImport();
    const storedJobs = loadDashboardJobs();
    const storedLibrary = hydrateResumeLibraryState();
    startTransition(() => {
      if (stored?.applications?.length) {
        setApplications(stored.applications);
      }
      if (storedJobs.jobs.length) {
        const library = storedLibrary.library;
        if (library) {
          const refreshed = reevaluateApplyFlowJobs(
            storedJobs.jobs,
            getDefaultResumeVariant(library).profile,
            library,
          );
          if (refreshed.some((job, index) => job !== storedJobs.jobs[index])) {
            persistDashboardJobs(refreshed);
          }
          setJobs(refreshed);
        } else {
          setJobs(storedJobs.jobs);
        }
      }
      setJobsStorageStatus(storedJobs.status);
      setJobsIgnoredCount(storedJobs.ignoredCount);
      setJobsUnreadableReason(storedJobs.reason);
      setResumeLibrary(storedLibrary.library);
      setResumeLibraryStatus(storedLibrary.status);
      const restoredCount = (stored?.applications?.length ?? 0) + storedJobs.jobs.length;
      if (restoredCount > 0) {
        setImportFeedback({
          loaded: restoredCount,
          ignored: 0,
          kind: "restored",
        });
      }
      setHydrated(true);
    });
  }, [persistenceV2Enabled]);

  const now = useMemo(() => new Date(), []);

  const workFlags = useMemo(
    () =>
      dashboardWorkFlags({
        resumeCount: resumeLibrary?.variants.length ?? 0,
        jobCount: jobs.length,
        applicationCount: applications.length,
      }),
    [resumeLibrary?.variants.length, jobs.length, applications.length],
  );
  const nextStep = dashboardNextStepId(workFlags);
  const nextStepHref = nextStep === "analyze" ? dashboardAnalyzeHref(jobs) : undefined;
  const showApplications = shouldShowApplicationsList(workFlags);
  const showLabExport = shouldShowInterviewLabExport(applications.length);

  const filtered = useMemo(
    () => applyDashboardTableFilters(applications, filters, now),
    [applications, filters, now],
  );

  const careerExportPreview = useMemo(() => {
    const mapped = applications.map(mapApplyFlowApplicationToCareer);
    const temp = createCareerBundle(mapped);
    const interviewReady = getInterviewReadyApplications(temp);
    const bundle = buildInterviewLabCareerBundle(applications);
    return {
      exportRowCount: bundle.applications.length,
      interviewReadyInHistory: interviewReady.length,
    };
  }, [applications]);

  const [careerCopyFeedback, setCareerCopyFeedback] = useState<"idle" | "success" | "error">("idle");
  const [careerCopyMessage, setCareerCopyMessage] = useState<string | null>(null);
  const [includeDemoSyncEnrichment, setIncludeDemoSyncEnrichment] = useState(false);
  const [eligibleProviderEnrichment] = useState<CareerBundleUnifiedSyncEnrichment | null>(null);

  const exportComposition = useMemo(
    () =>
      deriveDashboardCareerBundleExportComposition({
        applications,
        includeDemoSyncEnrichment,
        eligibleProviderEnrichment,
      }),
    [applications, includeDemoSyncEnrichment, eligibleProviderEnrichment],
  );

  const exportCareerBundle = exportComposition.bundle;

  const buildExportCareerBundle = useCallback(() => {
    if (exportCareerBundle == null) {
      return buildInterviewLabCareerBundleForExport(applications, {
        syncEnrichmentSource: exportComposition.source,
      });
    }

    return exportCareerBundle;
  }, [applications, exportCareerBundle, exportComposition.source]);

  const onCopyCareerBundleForInterviewLab = useCallback(async () => {
    setCareerCopyFeedback("idle");
    setCareerCopyMessage(null);
    const bundle = buildExportCareerBundle();
    const json = stringifyInterviewLabCareerBundleExport(bundle);
    const r = await copyCareerBundleJsonToClipboard(json);
    if (r.ok) {
      setCareerCopyFeedback("success");
      window.setTimeout(() => setCareerCopyFeedback("idle"), 3200);
    } else {
      setCareerCopyFeedback("error");
      setCareerCopyMessage(r.error);
    }
  }, [buildExportCareerBundle]);

  const onOpenInterviewLabImport = useCallback(() => {
    window.open(getInterviewLabImportHandoffUrl(), "_blank", "noopener,noreferrer");
  }, []);

  const [prepareHandoffHint, setPrepareHandoffHint] = useState<"idle" | "ack" | "clipboard" | "error">("idle");
  const [prepareHandoffMessage, setPrepareHandoffMessage] = useState<string | null>(null);

  const onPrepareInInterviewLab = useCallback(async () => {
    setPrepareHandoffHint("idle");
    setPrepareHandoffMessage(null);
    const bundle = buildExportCareerBundle();
    const r = await sendCareerBundleViaPostMessageWithRetry({
      bundle,
      stringifyBundle: stringifyInterviewLabCareerBundleExport,
      copyToClipboard: copyCareerBundleJsonToClipboard,
    });
    if (r.kind === "ack") {
      setPrepareHandoffHint("ack");
      setPrepareHandoffMessage("CareerBundle sent to Interview Lab.");
    } else if (r.kind === "fallback_clipboard_ok") {
      setPrepareHandoffHint("clipboard");
      setPrepareHandoffMessage(
        "Interview Lab did not confirm delivery in time (popup blocked, tab closed, or origin mismatch). CareerBundle copied — use Import from clipboard.",
      );
    } else {
      setPrepareHandoffHint("error");
      setPrepareHandoffMessage(
        `${r.error} Use Export JSON to download the CareerBundle, or Copy CareerBundle if clipboard works.`,
      );
    }
    window.setTimeout(() => {
      setPrepareHandoffHint("idle");
      setPrepareHandoffMessage(null);
    }, 10000);
  }, [buildExportCareerBundle]);

  const [practiceRowHandoffHint, setPracticeRowHandoffHint] = useState<"idle" | "ack" | "clipboard" | "error">("idle");
  const [practiceRowHandoffMessage, setPracticeRowHandoffMessage] = useState<string | null>(null);
  const [practiceHandoffBusy, setPracticeHandoffBusy] = useState(false);

  const onPracticeThisRole = useCallback(async (app: ApplyFlowApplication) => {
    setPracticeRowHandoffHint("idle");
    setPracticeRowHandoffMessage(null);
    setPracticeHandoffBusy(true);
    const bundle = buildSingleRowCareerBundleForInterviewLab(app);
    try {
      const r = await sendCareerBundleViaPostMessageWithRetry({
        bundle,
        stringifyBundle: stringifyCareerBundleJson,
        copyToClipboard: copyCareerBundleJsonToClipboard,
        interviewLabUrl: getInterviewLabImportPostMessagePracticeHandoffUrl(),
        handshake: { intent: "practice", selectedApplicationId: app.id },
      });
      if (r.kind === "ack") {
        setPracticeRowHandoffHint("ack");
        setPracticeRowHandoffMessage("Interview Lab opened for this role.");
      } else if (r.kind === "fallback_clipboard_ok") {
        setPracticeRowHandoffHint("clipboard");
        setPracticeRowHandoffMessage(
          "Interview Lab did not confirm delivery in time. CareerBundle copied — use Import from clipboard on the Interview Lab tab.",
        );
      } else {
        setPracticeRowHandoffHint("error");
        setPracticeRowHandoffMessage(
          `${r.error} Use Export JSON to download the CareerBundle, or Copy CareerBundle if clipboard works.`,
        );
      }
    } finally {
      setPracticeHandoffBusy(false);
    }
    window.setTimeout(() => {
      setPracticeRowHandoffHint("idle");
      setPracticeRowHandoffMessage(null);
    }, 10000);
  }, []);

  const skillOptions = useMemo(() => collectDetectedSkills(applications), [applications]);

  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;
  const applicationsRef = useRef(applications);
  applicationsRef.current = applications;
  const resumeLibraryRef = useRef(resumeLibrary);
  resumeLibraryRef.current = resumeLibrary;

  const commitJobs = useCallback((incoming: ApplyFlowJob[]) => {
    if (persistenceV2Enabled) {
      setImportError(V2_LOCAL_IMPORT_BLOCKED);
      return { jobs: jobsRef.current, added: 0, skipped: incoming.length };
    }
    const merged = mergeApplyFlowJobs(jobsRef.current, incoming);
    persistDashboardJobs(merged.jobs);
    setJobs(merged.jobs);
    setImportFeedback({
      loaded: merged.added,
      ignored: merged.skipped,
      kind: "jobs",
    });
    if (merged.added === 0 && merged.skipped > 0) {
      setJobInboxError("Esta vaga já está no inbox (mesmo conteúdo ou mesmo id).");
    } else {
      setJobInboxError(null);
    }
    return merged;
  }, [persistenceV2Enabled]);

  const commitResumeLibrary = useCallback((library: ResumeLibrary) => {
    const persisted = persistResumeLibrary(library);
    if (!persisted.ok) {
      setResumeLibraryError(persisted.error);
      return;
    }
    setResumeLibrary(library);
    setResumeLibraryError(null);
    const currentJobs = jobsRef.current;
    if (currentJobs.length === 0) return;
    const nextJobs = reevaluateApplyFlowJobs(currentJobs, getDefaultResumeVariant(library).profile, library);
    if (!nextJobs.some((job, index) => job !== currentJobs[index])) return;
    if (persistenceV2Enabled) {
      const persistence = persistenceRef.current;
      if (!persistence) return;
      const changed = nextJobs.filter((job, index) => job !== currentJobs[index]);
      void Promise.all(changed.map((job) => persistence.updateJob(job))).then((results) => {
        const failed = results.find((result) => !result.ok);
        if (failed && !failed.ok) {
          setJobInboxError(dashboardPersistenceFailureMessage(failed.code));
          return;
        }
        setJobs((prev) =>
          results.reduce((jobs, result) => (result.ok ? replaceApplyFlowJob(jobs, result.data) : jobs), prev),
        );
      });
      return;
    }
    persistDashboardJobs(nextJobs);
    setJobs(nextJobs);
  }, [persistenceV2Enabled]);

  const matchProfile = useCallback(() => resolveInboxMatchProfile(resumeLibraryRef.current), []);

  const onEvaluatePaste = useCallback(
    async (input: { description: string; title: string; company: string; url: string }) => {
      const description = input.description.trim();
      if (!description) {
        setJobInboxError("Cola o texto da vaga para avaliar.");
        return "error" as const;
      }
      const profile = matchProfile();
      if (!profile) {
        setJobInboxError(JOB_INBOX_NEEDS_RESUME);
        return "error" as const;
      }
      if (findJobByCanonicalUrl(jobsRef.current, input.url)) {
        setJobInboxError(null);
        return "duplicate_url" as const;
      }
      const job = ingestApplyFlowJob({
        description,
        source: "paste",
        title: input.title,
        company: input.company,
        url: input.url,
        profile,
        resumeLibrary: resumeLibraryRef.current ?? undefined,
      });
      if (persistenceV2Enabled) {
        const persistence = persistenceRef.current;
        if (!persistence) return "error" as const;
        const created = await persistence.createJob(job);
        if (!created.ok) {
          setJobInboxError(dashboardPersistenceFailureMessage(created.code));
          return created.code === "job_already_exists" ? ("duplicate_content" as const) : ("error" as const);
        }
        setJobs((prev) => [...prev.filter((item) => item.id !== created.data.id), created.data]);
        setJobInboxError(null);
        return "added" as const;
      }
      const merged = commitJobs([job]);
      if (merged.added === 0 && merged.skipped > 0) return "duplicate_content" as const;
      return "added" as const;
    },
    [commitJobs, matchProfile, persistenceV2Enabled],
  );

  const replaceJob = useCallback((next: ApplyFlowJob) => {
    if (persistenceV2Enabled) {
      const persistence = persistenceRef.current;
      if (!persistence) return;
      void persistence.updateJob(next).then((result) => {
        if (!result.ok) {
          setJobInboxError(dashboardPersistenceFailureMessage(result.code));
          return;
        }
        setJobs((prev) => replaceApplyFlowJob(prev, result.data));
        setJobInboxError(null);
      });
      return;
    }
    const nextJobs = replaceApplyFlowJob(jobsRef.current, next);
    persistDashboardJobs(nextJobs);
    setJobs(nextJobs);
    setJobInboxError(null);
  }, [persistenceV2Enabled]);

  const onReevaluateJob = useCallback(
    (jobId: string) => {
      const library = resumeLibraryRef.current;
      const job = jobsRef.current.find((item) => item.id === jobId);
      if (!job || !library) {
        setJobInboxError(JOB_INBOX_NEEDS_RESUME);
        return;
      }
      replaceJob(reevaluateApplyFlowJobMatch(job, getDefaultResumeVariant(library).profile, library));
    },
    [replaceJob],
  );

  const onCreateApplicationPack = useCallback((jobId: string, variantId?: string) => {
    const library = resumeLibraryRef.current;
    const job = jobsRef.current.find((item) => item.id === jobId);
    if (!job || !library) {
      setJobInboxError("Não foi possível preparar a candidatura.");
      return;
    }
    const result = createApplicationPack({ job, library, variantId });
    if (!result.ok) {
      setJobInboxError(result.error);
      return;
    }
    replaceJob(result.job);
  }, [replaceJob]);

  const onTogglePackChecklist = useCallback(
    (jobId: string, itemId: ApplicationPackChecklistId, done: boolean) => {
      const job = jobsRef.current.find((item) => item.id === jobId);
      if (!job?.applicationPack) return;
      replaceJob(setApplicationPackChecklistItem({ job, itemId, done }));
    },
    [replaceJob],
  );

  const commitApplicationSubmitted = useCallback((application: ApplyFlowApplication) => {
    if (persistenceV2Enabled) {
      const persistence = persistenceRef.current;
      if (!persistence) return;
      const envelope = application as ApplyFlowApplicationV2Envelope;
      void persistence.updateApplication({ ...envelope, status: "applied" }).then(async (result) => {
        if (!result.ok) {
          setImportError(dashboardPersistenceFailureMessage(result.code));
          return;
        }
        setApplications((prev) => [...prev.filter((item) => item.id !== result.data.id), result.data]);
        const sourceJobId = result.data.v2?.sourceJobId;
        const linked = sourceJobId ? jobsRef.current.find((job) => job.id === sourceJobId) : undefined;
        if (!linked || linked.status === "applied") return;
        const jobResult = await persistence.updateJob(markApplyFlowJobApplied(linked));
        if (!jobResult.ok) {
          setJobInboxError(dashboardPersistenceFailureMessage(jobResult.code));
          return;
        }
        setJobs((prev) => replaceApplyFlowJob(prev, jobResult.data));
      });
      return;
    }
    const persisted = persistApplicationSubmitted(application);
    if (!persisted.ok) {
      setImportError(persisted.error);
      return;
    }
    setApplications((prev) => [...prev.filter((item) => item.id !== persisted.application.id), persisted.application]);
    const nextJobs = loadDashboardJobs();
    if (nextJobs.jobs.length) setJobs(nextJobs.jobs);
  }, [persistenceV2Enabled]);

  const onMarkJobApplied = useCallback(
    (jobId: string) => {
      const job = jobsRef.current.find((item) => item.id === jobId);
      if (!job) return;
      const linked = findApplicationForJob(applicationsRef.current, job);
      if (linked) {
        commitApplicationSubmitted(linked);
        return;
      }
      replaceJob(markApplyFlowJobApplied(job));
    },
    [commitApplicationSubmitted, replaceJob],
  );

  const processJsonText = useCallback((text: string) => {
    if (persistenceV2Enabled) {
      setImportError(V2_LOCAL_IMPORT_BLOCKED);
      setImportFeedback(null);
      return;
    }
    setImportError(null);
    const r = parseApplyFlowDashboardImportJsonString(text, {
      profile: matchProfile() ?? undefined,
      resumeLibrary: resumeLibraryRef.current ?? undefined,
    });
    if (!r.ok) {
      setImportError(r.error);
      setImportFeedback(null);
      return;
    }
    if (r.kind === "career-bundle-v2") {
      if (r.bundle.jobs.length) commitJobs(r.bundle.jobs);
      if (r.bundle.applications.length) {
        const applications = r.bundle.applications.map(stripApplicationV2Meta);
        setApplications(applications);
        persistDashboardImport(applications);
      }
      persistDashboardContacts(r.bundle.contacts, r.bundle.interactions);
      persistDashboardAnalytics(r.bundle.outcomes ?? [], r.bundle.events ?? [], r.bundle.efforts ?? []);
      setImportFeedback({
        loaded: r.bundle.applications.length || r.bundle.jobs.length || r.bundle.contacts.length,
        ignored: 0,
        kind: "import",
      });
      setImportError(null);
      return;
    }
    if (r.kind === "jobs") {
      commitJobs(r.result.jobs);
      setImportError(null);
      return;
    }
    if (r.kind === "resume-library") {
      commitResumeLibrary(r.library);
      setImportFeedback({ loaded: r.library.variants.length, ignored: 0, kind: "import" });
      setImportError(null);
      return;
    }
    if (r.kind === "resume-profile") {
      const library = resumeLibraryRef.current;
      if (!library) {
        commitResumeLibrary(createResumeLibraryFromProfile(r.profile, { source: "import" }));
        setImportFeedback({ loaded: 1, ignored: 0, kind: "import" });
        setImportError(null);
        return;
      }
      const added = addResumeVariant(library, {
        profile: r.profile,
        name: r.profile.roles[0]?.trim() || "Currículo importado",
        source: "import",
      });
      if (!added.ok) {
        setResumeLibraryError(added.error);
        return;
      }
      commitResumeLibrary(added.library);
      setImportFeedback({ loaded: 1, ignored: 0, kind: "import" });
      setImportError(null);
      return;
    }
    setApplications(r.result.applications);
    persistDashboardImport(r.result.applications);
    setImportFeedback({
      loaded: r.result.applications.length,
      ignored: r.result.ignoredCount,
      kind: "import",
    });
    setImportError(null);
  }, [commitJobs, commitResumeLibrary, matchProfile, persistenceV2Enabled]);

  const onFile = useCallback(
    (file: File | null) => {
      if (!file) return;
      void file.text().then((t) => processJsonText(t));
    },
    [processJsonText],
  );

  const loadDemo = useCallback(async () => {
    if (persistenceV2Enabled) {
      setImportError(V2_LOCAL_IMPORT_BLOCKED);
      setImportFeedback(null);
      return;
    }
    if (applications.length > 0) {
      const ok = window.confirm(
        "Já existem dados no dashboard. Substituir pelo conjunto de demonstração fictício?",
      );
      if (!ok) return;
    }
    setImportError(null);
    setDemoLoading(true);
    try {
      const res = await fetch(DEMO_APPLICATIONS_PUBLIC_PATH);
      if (!res.ok) {
        setImportError("Não foi possível carregar o ficheiro de demo (404 ou rede).");
        setImportFeedback(null);
        return;
      }
      const text = await res.text();
      const r = parseApplyFlowImportJsonString(text);
      if (!r.ok) {
        setImportError(r.error);
        setImportFeedback(null);
        return;
      }
      setApplications(r.applications);
      persistDashboardImport(r.applications);
      setImportFeedback({
        loaded: r.applications.length,
        ignored: r.ignoredCount,
        kind: "demo",
      });
      setFilters(defaultFilters);
    } catch {
      setImportError("Falha ao carregar a demo. Tente outra vez.");
      setImportFeedback(null);
    } finally {
      setDemoLoading(false);
    }
  }, [applications.length, persistenceV2Enabled]);

  const tableEmpty = showApplications && filtered.length === 0;
  const showJobsRecovery = jobsStorageStatus === "partial" || jobsStorageStatus === "unreadable";
  const pilotMode = isCareerPilotModeClient();

  if (!hydrated) {
    return (
      <ApplyFlowCard variant="muted" padding="lg" className="text-center">
        <p className="text-sm text-[color:var(--af-text-muted)]">
          {persistenceV2Enabled ? "A carregar os dados da conta…" : "A preparar o painel e ler o armazenamento local…"}
        </p>
      </ApplyFlowCard>
    );
  }

  if (remoteGate) {
    return <DashboardPersistenceNotice kind={remoteGate} />;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10 overflow-x-hidden pb-12 sm:space-y-12">
      <ApplyFlowPrivacyNotice />

      {pilotMode ? <CareerPilotExperience /> : null}

      {showJobsRecovery ? (
        <JobsStorageRecoveryBanner
          status={jobsStorageStatus}
          ignoredCount={jobsIgnoredCount}
          reason={jobsUnreadableReason}
          onDiscard={() => {
            clearPersistedDashboardJobs();
            setJobs([]);
            setJobsStorageStatus("empty");
            setJobsIgnoredCount(0);
            setJobsUnreadableReason(undefined);
            setJobInboxError(null);
          }}
        />
      ) : null}

      {resumeLibraryStatus === "unreadable" ? (
        <ResumeLibraryRecoveryBanner
          onDiscard={() => {
            clearPersistedResumeLibrary();
            setResumeLibrary(null);
            setResumeLibraryStatus("empty");
            setResumeLibraryError(null);
          }}
          onImportProfileFile={(file) => {
            if (!file) return;
            void file.text().then((text) => processJsonText(text));
          }}
        />
      ) : null}

      <DashboardNextStep step={nextStep} href={nextStepHref} />

      {resumeLibraryStatus !== "unreadable" ? (
        <ResumeLibraryPanel
          library={resumeLibrary}
          error={resumeLibraryError}
          jobScopes={jobs.map((job) => ({
            id: job.id,
            label: [job.title, job.company].filter(Boolean).join(" · ") || job.id,
          }))}
          onSetDefault={(id) => {
            if (!resumeLibrary) return;
            const result = setDefaultResumeVariant(resumeLibrary, id);
            if (!result.ok) {
              setResumeLibraryError(result.error);
              return;
            }
            commitResumeLibrary(result.library);
          }}
          onRename={(id, name) => {
            if (!resumeLibrary) return;
            const result = renameResumeVariant(resumeLibrary, id, name);
            if (!result.ok) {
              setResumeLibraryError(result.error);
              return;
            }
            commitResumeLibrary(result.library);
          }}
          onDelete={(id) => {
            if (!resumeLibrary) return;
            const result = deleteResumeVariant(resumeLibrary, id);
            if (!result.ok) {
              setResumeLibraryError(result.error);
              return;
            }
            commitResumeLibrary(result.library);
          }}
          onDuplicate={(name) => {
            if (!resumeLibrary) return;
            const result = duplicateResumeVariant(resumeLibrary, resumeLibrary.defaultVariantId, { name });
            if (!result.ok) {
              setResumeLibraryError(result.error);
              return;
            }
            commitResumeLibrary(result.library);
          }}
          onImportProfileFile={(file) => {
            if (!file) return;
            void file.text().then((text) => processJsonText(text));
          }}
          onSaveProfile={(profile, options) => {
            try {
              const validated = validateSavableCandidateProfile(profile);
              const current = resumeLibraryRef.current;
              const variantName = options.variantName ?? validated.roles[0] ?? validated.name;
              if (!current) {
                commitResumeLibrary(
                  createResumeLibraryFromProfile(validated, {
                    name: variantName,
                    source: "manual",
                  }),
                );
                return { ok: true };
              }
              if (options.variantId) {
                const result = updateResumeVariant(current, options.variantId, {
                  profile: validated,
                  ...(options.variantName ? { name: options.variantName } : {}),
                });
                if (!result.ok) return { ok: false, error: result.error };
                commitResumeLibrary(result.library);
                return { ok: true };
              }
              const added = addResumeVariant(current, {
                profile: validated,
                name: variantName,
                source: "manual",
              });
              if (!added.ok) return { ok: false, error: added.error };
              commitResumeLibrary(added.library);
              return { ok: true };
            } catch (err) {
              return {
                ok: false,
                error: err instanceof Error ? err.message : "Não foi possível guardar o perfil.",
              };
            }
          }}
        />
      ) : null}

      <JobInboxPanel
        jobs={jobs}
        error={jobInboxError}
        evaluatedWithName={resumeLibrary ? getDefaultResumeVariant(resumeLibrary).name : null}
        matchAvailable={Boolean(resumeLibrary)}
        resumeLibrary={resumeLibrary}
        onEvaluatePaste={onEvaluatePaste}
        onCreateApplicationPack={onCreateApplicationPack}
        onTogglePackChecklist={onTogglePackChecklist}
        onMarkJobApplied={onMarkJobApplied}
        onReevaluateJob={onReevaluateJob}
        applications={applications}
      />

      {shouldShowProviderConsentOnDashboard() ? (
        <ProviderConsentConfirmationPanel
          gmailRuntimeEnabled={gmailRuntimeEnabled}
          applications={applications}
          persistenceV2Enabled={persistenceV2Enabled}
        />
      ) : null}

      {showApplications ? (
        <>
          <InboundApplicationResponsePanel
            applications={applications}
            outcomes={loadDashboardAnalytics().outcomes}
            gmailRuntimeEnabled={gmailRuntimeEnabled}
            persistenceV2Enabled={persistenceV2Enabled}
            onApplicationUpdated={(application) => {
              setApplications((prev) => [...prev.filter((item) => item.id !== application.id), application]);
            }}
          />
          <ApplyFlowSection
            id="applications"
            title={DASHBOARD_APPLICATIONS_TITLE}
            description={DASHBOARD_APPLICATIONS_DESCRIPTION}
          >
            <p className="mb-3 text-xs text-[color:var(--af-text-muted)]">
              {applications.length} candidatura{applications.length === 1 ? "" : "s"} registada{applications.length === 1 ? "" : "s"}.{" "}
              <Link href="/dashboard/analytics" className="font-medium text-emerald-300 hover:text-emerald-200">
                {CAREER_ANALYTICS_LINK}
              </Link>
              {" — "}
              {DASHBOARD_ANALYTICS_HINT}
            </p>
            <ApplyFlowCard variant="muted" padding="md" className="flex flex-wrap gap-2 sm:gap-3">
              <select
                className={cn(filterSelectClass, "sm:max-w-[200px]")}
                value={filters.period}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, period: e.target.value as DashboardTableFilters["period"] }))
                }
              >
                <option value="all">Período: todos</option>
                <option value="7d">Últimos 7 dias</option>
                <option value="30d">Últimos 30 dias</option>
                <option value="90d">Últimos 90 dias</option>
              </select>
              <select
                className={cn(filterSelectClass, "sm:max-w-[220px]")}
                value={filters.status}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, status: e.target.value as DashboardTableFilters["status"] }))
                }
              >
                <option value="all">Estado: todos</option>
                {(Object.keys(APPLYFLOW_APPLICATION_STATUS_LABELS_PT) as ApplyFlowApplicationStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {APPLYFLOW_APPLICATION_STATUS_LABELS_PT[s]}
                  </option>
                ))}
              </select>
              <select
                className={cn(filterSelectClass, "sm:max-w-[180px]")}
                value={filters.skill}
                onChange={(e) => setFilters((f) => ({ ...f, skill: e.target.value }))}
              >
                <option value="">Skill: todas</option>
                {skillOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <select
                className={filterSelectClass}
                value={filters.workModel}
                onChange={(e) => setFilters((f) => ({ ...f, workModel: e.target.value }))}
              >
                <option value="all">Modelo: todos</option>
                <option value="remote">Remoto</option>
                <option value="hybrid">Híbrido</option>
                <option value="onsite">Presencial</option>
                <option value="unknown">Desconhecido</option>
              </select>
              <select
                className={filterSelectClass}
                value={filters.contractType}
                onChange={(e) => setFilters((f) => ({ ...f, contractType: e.target.value }))}
              >
                <option value="all">Contrato: todos</option>
                <option value="clt">CLT</option>
                <option value="pj">PJ</option>
                <option value="contractor">Contractor</option>
                <option value="internship">Estágio</option>
                <option value="unknown">Desconhecido</option>
              </select>
              <select
                className={filterSelectClass}
                value={filters.englishRequired}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    englishRequired: e.target.value as DashboardTableFilters["englishRequired"],
                  }))
                }
              >
                <option value="all">Inglês: todos</option>
                <option value="yes">Exigido (sim)</option>
                <option value="no">Não / não indicado</option>
              </select>
            </ApplyFlowCard>

            {tableEmpty ? (
              <ApplyFlowEmptyState
                variant="warning"
                title="Nenhum resultado para os filtros atuais"
                description="Alarga o período, limpa a skill ou escolhe «todos» nos selects. Os dados importados continuam guardados neste navegador."
                primaryLabel="Repor filtros"
                onPrimary={() => setFilters(defaultFilters)}
              />
            ) : null}

            <div className="-mx-4 overflow-x-auto rounded-[var(--af-radius)] border border-[color:var(--af-border)] sm:mx-0">
              <table className="w-full min-w-[1080px] text-left text-sm">
                <thead className="border-b border-[color:var(--af-border)] bg-[color:var(--af-bg-soft)] text-[11px] uppercase tracking-wide text-[color:var(--af-text-muted)] sm:text-xs">
                  <tr>
                    <th className="whitespace-nowrap px-3 py-3.5">Data</th>
                    <th className="px-3 py-3.5">Empresa</th>
                    <th className="px-3 py-3.5">Vaga</th>
                    <th className="px-3 py-3.5">Estado</th>
                    <th className="px-3 py-3.5">Fit</th>
                    <th className="px-3 py-3.5">Senioridade</th>
                    <th className="px-3 py-3.5">Tipo</th>
                    <th className="px-3 py-3.5">Modelo</th>
                    <th className="px-3 py-3.5">Contrato</th>
                    <th className="px-3 py-3.5">Inglês</th>
                    <th className="px-3 py-3.5">Skills</th>
                    <th className="px-3 py-3.5">Notas</th>
                    <th className="whitespace-nowrap px-3 py-3.5">Entrevista</th>
                    <th className="px-3 py-3.5">Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--af-border)]">
                  {filtered.map((a) => (
                    <tr
                      key={a.id}
                      className="bg-[color:var(--af-bg)]/80 transition-colors hover:bg-[color:var(--af-surface-muted)]"
                    >
                      <td className="whitespace-nowrap px-3 py-3 text-[color:var(--af-text-muted)]">
                        {new Date(a.createdAt).toLocaleDateString("pt-BR")}
                      </td>
                      <td
                        className="max-w-[130px] truncate px-3 py-3 text-[color:var(--af-text)] sm:max-w-[160px]"
                        title={a.companyName}
                      >
                        {a.companyName ?? "—"}
                      </td>
                      <td
                        className="max-w-[150px] truncate px-3 py-3 font-medium text-[color:var(--af-text)] sm:max-w-[180px]"
                        title={a.jobTitle}
                      >
                        {a.jobTitle ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        <div className="grid gap-1">
                          <ApplyFlowBadge tone={statusTone(a.status)}>
                            {APPLYFLOW_APPLICATION_STATUS_LABELS_PT[a.status]}
                          </ApplyFlowBadge>
                          {a.status === "reviewing" ? (
                            <ApplyFlowButton
                              type="button"
                              variant="outlineBrand"
                              size="sm"
                              className="w-fit text-[11px]"
                              onClick={() => commitApplicationSubmitted(a)}
                            >
                              {DASHBOARD_MARK_SENT}
                            </ApplyFlowButton>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-3 tabular-nums text-[color:var(--af-text-muted)]">{a.fitScore ?? "—"}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-[color:var(--af-text-muted)]">
                        {a.jobMeta?.seniority ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-[color:var(--af-text-muted)]">
                        {a.jobMeta?.roleType ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-[color:var(--af-text-muted)]">
                        {a.jobMeta?.workModel ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-[color:var(--af-text-muted)]">
                        {a.jobMeta?.contractType ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-[color:var(--af-text-muted)]">
                        {a.jobMeta?.englishRequired === true ? "sim" : a.jobMeta?.englishRequired === false ? "não" : "—"}
                      </td>
                      <td
                        className="max-w-[160px] truncate px-3 py-3 text-[color:var(--af-text-muted)] sm:max-w-[200px]"
                        title={(a.jobMeta?.detectedSkills ?? []).join(", ")}
                      >
                        {(a.jobMeta?.detectedSkills ?? []).slice(0, 4).join(", ") || "—"}
                      </td>
                      <td
                        className="max-w-[120px] truncate px-3 py-3 text-[color:var(--af-text-muted)] sm:max-w-[160px]"
                        title={a.notes}
                      >
                        {a.notes ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 align-top">
                        <ApplyFlowButton
                          type="button"
                          variant="outlineBrand"
                          size="sm"
                          className="max-w-[140px] whitespace-normal text-center text-[11px] leading-tight sm:max-w-none"
                          disabled={practiceHandoffBusy}
                          title={DASHBOARD_PREPARE_INTERVIEW_HINT}
                          onClick={() => void onPracticeThisRole(a)}
                        >
                          {DASHBOARD_PREPARE_INTERVIEW}
                        </ApplyFlowButton>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        <div className="grid gap-1">
                          <DashboardJobUrlCell url={a.jobUrl} />
                          {a.v2?.sourceJobId ? (
                            <Link
                              href={`/dashboard/jobs/${encodeURIComponent(a.v2.sourceJobId)}`}
                              className="text-[11px] font-medium text-emerald-400 hover:text-emerald-300 hover:underline"
                            >
                              Ver análise
                            </Link>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {practiceRowHandoffHint === "ack" && practiceRowHandoffMessage ? (
              <p className="mt-3 text-center text-[11px] font-medium text-emerald-300 sm:text-left">{practiceRowHandoffMessage}</p>
            ) : null}
            {practiceRowHandoffHint === "clipboard" && practiceRowHandoffMessage ? (
              <p className="mt-3 max-w-xl text-center text-[11px] leading-snug text-amber-200/95 sm:text-left">{practiceRowHandoffMessage}</p>
            ) : null}
            {practiceRowHandoffHint === "error" && practiceRowHandoffMessage ? (
              <p className="mt-3 max-w-xl text-center text-[11px] leading-snug text-red-200/95 sm:text-left">{practiceRowHandoffMessage}</p>
            ) : null}
          </ApplyFlowSection>
        </>
      ) : null}

      <ApplyFlowSection
        id="como-importar"
        title={DASHBOARD_DATA_TITLE}
        description={DASHBOARD_DATA_DESCRIPTION}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-stretch">
          <ApplyFlowCard
            variant="muted"
            padding="lg"
            className={cn(
              "grow border-dashed transition-colors sm:min-w-[220px]",
              dragOver ? "border-emerald-500/55 bg-emerald-950/20" : "border-[color:var(--af-border-strong)]",
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files[0];
              onFile(f ?? null);
            }}
          >
            <div className="text-center">
              <input
                id="af-json"
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => onFile(e.target.files?.[0] ?? null)}
              />
              <label
                htmlFor="af-json"
                className={applyFlowButtonClass({
                  variant: "primary",
                  size: "md",
                  className: "cursor-pointer",
                })}
              >
                Importar JSON
              </label>
              <p className="mt-3 text-xs text-[color:var(--af-text-muted)]">
                Arrasta um ficheiro para aqui — processado só no teu dispositivo.
              </p>
            </div>
          </ApplyFlowCard>

          <div id="carregar-demo" className="flex scroll-mt-24 flex-col items-stretch justify-center gap-2 sm:w-auto">
            <ApplyFlowButton
              type="button"
              variant="outlineBrand"
              size="md"
              disabled={demoLoading}
              className="w-full min-w-[180px] sm:w-auto"
              onClick={() => void loadDemo()}
            >
              {demoLoading ? "A carregar demo…" : "Carregar demo"}
            </ApplyFlowButton>
            <p className="text-center text-[11px] text-[color:var(--af-text-muted)] sm:text-left">
              ~20 vagas fictícias · sem PII
            </p>
          </div>
        </div>

        {importError ? (
          <ApplyFlowCard variant="danger" padding="md" role="alert">
            <p className="font-medium text-red-200">Não foi possível usar este ficheiro</p>
            <p className="mt-1 text-sm text-red-100/90">{importError}</p>
            <p className="mt-3 text-xs text-red-200/85">
              Confirma que exportaste o backup a partir da extensão ou experimenta a <strong>demo</strong> para ver o painel
              com dados fictícios.
            </p>
          </ApplyFlowCard>
        ) : null}

        {importFeedback ? (
          <ApplyFlowCard variant="success" padding="md" className="text-sm text-emerald-100/95">
            {feedbackSummary(importFeedback)}
            {importFeedback.kind !== "demo"
              ? (() => {
                  const r = computeCreatedAtRange(applications);
                  if (!r.oldest || !r.newest) return null;
                  return (
                    <span className="mt-1 block text-xs text-emerald-200/75">
                      Período (criação): {new Date(r.oldest).toLocaleDateString("pt-BR")} —{" "}
                      {new Date(r.newest).toLocaleDateString("pt-BR")}
                    </span>
                  );
                })()
              : null}
            {importFeedback.kind === "demo" ? (
              <span className="mt-1 block text-xs text-emerald-200/70">
                Empresas e vagas são inteiramente fictícias (demonstração de portefólio).
              </span>
            ) : null}
          </ApplyFlowCard>
        ) : null}

        {showLabExport ? (
          <ApplyFlowCard variant="muted" padding="md" className="border border-[color:var(--af-border-strong)]/80">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-xl space-y-2">
                <h3 className="text-sm font-semibold text-[color:var(--af-text)]">Interview Lab · exportação local</h3>
                <p className="text-xs leading-relaxed text-[color:var(--af-text-muted)]">
                  <span className="text-[color:var(--af-text)]">
                    Export your selected applications as a CareerBundle and import them into Interview Lab for
                    role-specific interview practice.
                  </span>{" "}
                  O ficheiro JSON é gerado <strong className="text-[color:var(--af-text)]">só neste browser</strong>{" "}
                  (sem upload para servidores ApplyFlow ou Interview Lab).
                </p>
                <p className="text-[11px] leading-snug text-zinc-500">
                  Este export usa as candidaturas carregadas no dashboard (histórico importado ou demo), com regras de
                  prioridade do <code className="rounded bg-zinc-800/80 px-1 py-0.5 text-zinc-300">@devflow/career-core</code>{" "}
                  (entrevista → aplicadas/revisão → restantes).
                </p>
                <p className="text-[11px] leading-snug text-zinc-500">
                  <strong className="font-medium text-zinc-400">Handoff rápido:</strong>{" "}
                  <span className="text-zinc-500">Prepare in Interview Lab</span> abre o Interview Lab na lista de importação e envia o bundle por{" "}
                  <code className="rounded bg-zinc-800/80 px-1 py-0.5 text-zinc-300">postMessage</code> (sem dados na URL). Na tabela,{" "}
                  <span className="text-zinc-500">{DASHBOARD_PREPARE_INTERVIEW}</span> envia uma linha e abre a prática directamente.{" "}
                  <span className="text-zinc-500">Copy CareerBundle</span> / <span className="text-zinc-500">Open Interview Lab</span>{" "}
                  / export JSON continuam como fallback.
                </p>
                {careerExportPreview.interviewReadyInHistory === 0 ? (
                  <ApplyFlowCard variant="warning" padding="sm" className="text-xs text-amber-100/95">
                    <strong className="font-medium text-amber-100">Sem vagas em fase de entrevista</strong> neste
                    conjunto (mapeadas como &quot;interview requested&quot; / &quot;scheduled&quot;). O export continua
                    disponível e incluirá candidaturas em <strong>applied</strong>/<strong>saved</strong> ou o conjunto
                    completo, conforme as regras do bundle.
                  </ApplyFlowCard>
                ) : (
                  <p className="text-[11px] text-emerald-200/80">
                    {careerExportPreview.interviewReadyInHistory} candidatura(s) mapeada(s) para fase de entrevista no
                    histórico actual — o export prioriza essas linhas.
                  </p>
                )}
                <DashboardCareerExportCompositionSource sourceKind={exportComposition.sourceKind} />
                <p className="text-[11px] leading-snug text-[color:var(--af-text-muted)]">
                  {DASHBOARD_CAREER_EXPORT_READ_ONLY_NOTICE}
                </p>
                <label className="mt-2 flex cursor-pointer items-start gap-2.5 rounded-lg border border-[color:var(--af-border-strong)]/60 bg-[color:var(--af-surface)]/40 p-3">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 shrink-0 accent-emerald-500"
                    checked={includeDemoSyncEnrichment}
                    onChange={(e) => setIncludeDemoSyncEnrichment(e.target.checked)}
                  />
                  <span className="text-left text-[11px] leading-snug text-[color:var(--af-text-muted)]">
                    <span className="font-medium text-[color:var(--af-text)]">Demo sync enrichment</span>
                    {" — "}
                    Adds fake/sandbox derived signals to the exported CareerBundle so Interview Lab can show the
                    read-only sync enrichment preview. No Gmail or Calendar connection is made.
                  </span>
                </label>
              </div>
              <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                <ApplyFlowButton
                  type="button"
                  variant="primary"
                  size="md"
                  className="w-full font-semibold sm:w-auto"
                  disabled={careerExportPreview.exportRowCount === 0}
                  onClick={() => void onPrepareInInterviewLab()}
                >
                  Prepare in Interview Lab
                </ApplyFlowButton>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                  <ApplyFlowButton
                    type="button"
                    variant="outlineBrand"
                    size="md"
                    className="font-medium"
                    disabled={careerExportPreview.exportRowCount === 0}
                    onClick={() => void onCopyCareerBundleForInterviewLab()}
                  >
                    Copy CareerBundle
                  </ApplyFlowButton>
                  <ApplyFlowButton
                    type="button"
                    variant="outlineBrand"
                    size="md"
                    className="font-medium"
                    title={DASHBOARD_OPEN_INTERVIEW_LAB_HINT}
                    onClick={onOpenInterviewLabImport}
                  >
                    Open Interview Lab
                  </ApplyFlowButton>
                  <ApplyFlowButton
                    type="button"
                    variant="outlineBrand"
                    size="md"
                    className="font-medium"
                    disabled={careerExportPreview.exportRowCount === 0}
                    onClick={() => {
                      downloadCareerBundleJson(buildExportCareerBundle());
                    }}
                  >
                    Exportar para Interview Lab
                  </ApplyFlowButton>
                </div>
                {prepareHandoffHint === "ack" && prepareHandoffMessage ? (
                  <p className="text-center text-[11px] font-medium text-emerald-300 sm:text-right">{prepareHandoffMessage}</p>
                ) : null}
                {prepareHandoffHint === "clipboard" && prepareHandoffMessage ? (
                  <p className="max-w-xs text-center text-[11px] leading-snug text-amber-200/95 sm:text-right">{prepareHandoffMessage}</p>
                ) : null}
                {prepareHandoffHint === "error" && prepareHandoffMessage ? (
                  <p className="max-w-xs text-center text-[11px] leading-snug text-red-200/95 sm:text-right">{prepareHandoffMessage}</p>
                ) : null}
                {careerCopyFeedback === "success" ? (
                  <p className="text-center text-[11px] font-medium text-emerald-300 sm:text-right">CareerBundle copied.</p>
                ) : null}
                {careerCopyFeedback === "error" && careerCopyMessage ? (
                  <p className="max-w-xs text-center text-[11px] leading-snug text-amber-200/95 sm:text-right">{careerCopyMessage}</p>
                ) : null}
                <span className="text-center text-[10px] text-[color:var(--af-text-muted)] sm:text-right">
                  ~{careerExportPreview.exportRowCount} vaga(s) no JSON
                </span>
              </div>
            </div>
          </ApplyFlowCard>
        ) : null}

        {workFlags.hasApplications || workFlags.hasJobs ? (
          persistenceV2Enabled ? null : (
          <div className="flex flex-wrap items-center gap-4">
            <ApplyFlowButton
              type="button"
              variant="dangerGhost"
              size="sm"
              className="px-0 py-0 font-medium"
              onClick={() => {
                clearPersistedDashboardImport();
                clearPersistedDashboardJobs();
                setApplications([]);
                setJobs([]);
                setJobInboxError(null);
                setImportFeedback(null);
                setImportError(null);
                setFilters(defaultFilters);
              }}
            >
              Limpar dados do navegador
            </ApplyFlowButton>
          </div>
          )
        ) : null}
      </ApplyFlowSection>

    </div>
  );
}
