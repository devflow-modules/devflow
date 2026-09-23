"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ApplyFlowBadge, type ApplyFlowBadgeTone } from "@/components/ui/ApplyFlowBadge";
import { ApplyFlowButton } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import { ApplyFlowSection } from "@/components/ui/ApplyFlowSection";
import { loadJobDecisionV2Snapshot } from "@/lib/job-decision-v2-snapshot";
import {
  persistApplicationStatusTransition,
  persistApplicationSubmitted,
  persistApplicationWithOutcome,
  persistClosedLoopV1Backfill,
} from "@/lib/persist-application-decision";
import { getInterviewLabImportHandoffUrl } from "@/lib/interview-lab-handoff";
import { useClientHydrated } from "@/lib/use-client-hydrated";
import {
  APPLYFLOW_PIPELINE_STATUS_V2_LABELS_PT,
  canRecordApplicationOutcome,
  canTransitionApplicationStatus,
  createApplicationFromJob,
  formatLifecycleEventDate,
  resolvePipelineStatus,
  type ApplyFlowPipelineStatusV2,
  type Contact,
  type ApplicationDecision,
} from "@devflow/applyflow-core";

import {
  JOB_DECISION_V2_BACK,
  JOB_DECISION_V2_CLAIMS,
  JOB_DECISION_V2_CLAIMS_EMPTY,
  JOB_DECISION_V2_DIMENSIONS,
  JOB_DECISION_V2_EYEBROW,
  JOB_DECISION_V2_GATES,
  JOB_DECISION_V2_GATE_RESULT_LABELS,
  JOB_DECISION_V2_HINT,
  JOB_DECISION_V2_INPUTS,
  JOB_DECISION_V2_LABELS,
  JOB_DECISION_V2_MISSING,
  JOB_DECISION_V2_NO_TEXT,
  JOB_DECISION_V2_NEED_APPLICATION,
  JOB_DECISION_V2_NEED_RESUME,
  JOB_DECISION_V2_OPEN_LAB,
  JOB_DECISION_V2_INPUTS_HINT,
  JOB_DECISION_V2_LAB_HANDOFF,
  JOB_DECISION_V2_PACK_BLOCKED,
  JOB_DECISION_V2_PACK_INCOMPLETE,
  JOB_DECISION_V2_INCOMPLETE,
  JOB_DECISION_V2_REQUIREMENTS,
  JOB_DECISION_V2_TABS,
  JOB_DECISION_V2_TITLE,
  JOB_DECISION_V2_CREATE_APPLICATION,
  JOB_DECISION_V2_CREATE_HINT,
  JOB_DECISION_V2_APPLICATION_READY,
  JOB_DECISION_V2_MARK_SENT,
  JOB_DECISION_V2_MARK_SENT_HINT,
  JOB_DECISION_V2_MARKED_SENT,
  JOB_DECISION_V2_CURRENT_ANALYSIS,
  JOB_DECISION_V2_AT_APPLY_ANALYSIS,
  JOB_DECISION_V2_CURRENT_HINT,
  JOB_DECISION_V2_REGISTERED_PRESERVED,
  JOB_DECISION_V2_HISTORY,
  JOB_DECISION_V2_STATUS,
  JOB_DECISION_V2_HIRED,
  analysesDivergeOnPage,
  registeredAnalysisFromSnapshot,
} from "./job-decision-v2-content";
import { JobDecisionV2NetworkingTab } from "./job-decision-v2-networking-tab";

type JobV2Tab = keyof typeof JOB_DECISION_V2_TABS;

const EMPTY_CONTACTS: Contact[] = [];

function decisionTone(decision: ApplicationDecision): ApplyFlowBadgeTone {
  if (decision === "apply_high") return "success";
  if (decision === "apply_normal") return "brand";
  if (decision === "apply_stretch") return "warning";
  if (decision === "needs_info") return "warning";
  return "danger";
}

function matchTone(status: string): ApplyFlowBadgeTone {
  if (status === "proven") return "success";
  if (status === "partial") return "warning";
  if (status === "gap") return "danger";
  return "neutral";
}

export function JobDecisionV2Panel({ jobId }: { jobId: string }) {
  const hydrated = useClientHydrated();
  const [storageEpoch, setStorageEpoch] = useState(0);
  const snapshot = useMemo(() => {
    if (!hydrated) return null;
    return loadJobDecisionV2Snapshot(jobId, storageEpoch);
  }, [hydrated, jobId, storageEpoch]);

  useEffect(() => {
    if (!hydrated) return;
    persistClosedLoopV1Backfill();
  }, [hydrated, jobId]);
  const job = snapshot?.job;
  const decision = snapshot?.decision ?? null;
  const pack = snapshot?.pack ?? null;
  const contacts = snapshot?.contacts ?? EMPTY_CONTACTS;
  const application = snapshot?.application ?? null;
  const registeredSnapshot = snapshot?.registeredSnapshot ?? null;
  const lifecycleEvents = snapshot?.lifecycleEvents ?? [];
  const pipelineStatus = snapshot?.pipelineStatus ?? null;
  const needsResume = snapshot?.needsResume ?? false;
  const [tab, setTab] = useState<JobV2Tab>("overview");
  const [feedbackNote, setFeedbackNote] = useState<string>("");
  const [persistError, setPersistError] = useState<string | null>(null);

  const dimensions = useMemo(() => {
    if (!decision) return [];
    const d = decision.dimensions;
    return [
      ["Overall", d.overall],
      ["Core engineering", d.coreEngineering],
      ["Stack", d.stack],
      ["Specialization", d.specialization],
      ["Seniority", d.seniority],
      ["Product", d.product],
      ["Cloud", d.cloud],
      ["AI", d.ai],
      ["Language", d.language],
    ].filter((row): row is [string, number] => typeof row[1] === "number");
  }, [decision]);

  const registeredAnalysis = useMemo(
    () => registeredAnalysisFromSnapshot(registeredSnapshot),
    [registeredSnapshot],
  );
  const showDivergentAnalyses = analysesDivergeOnPage(
    registeredAnalysis,
    decision ? { overall: decision.overall, decision: decision.decision } : null,
  );
  const currentPipeline = application
    ? pipelineStatus ?? resolvePipelineStatus({ application, outcome: undefined })
    : null;

  function createApplicationRecord() {
    if (!job || !decision) return;
    const created = createApplicationFromJob({
      job,
      decision,
      pack: pack && pack.status === "ready" ? pack : undefined,
    });
    const persisted = persistApplicationWithOutcome(created);
    if (!persisted.ok) {
      setPersistError(persisted.error);
      return;
    }
    setPersistError(null);
    refreshAfterPersist();
  }

  function refreshAfterPersist() {
    setStorageEpoch((epoch) => epoch + 1);
  }

  function markApplicationSent() {
    if (!application) return;
    const persisted = persistApplicationSubmitted(application);
    if (!persisted.ok) {
      setPersistError(persisted.error);
      return;
    }
    setPersistError(null);
    refreshAfterPersist();
  }

  function recordStatus(toStatus: ApplyFlowPipelineStatusV2) {
    if (!application || !canRecordApplicationOutcome(application.id, [application])) return;
    const persisted = persistApplicationStatusTransition({
      application,
      toStatus,
      notes: feedbackNote.trim() || undefined,
      rejectionReason: toStatus === "rejected" ? feedbackNote.trim() || undefined : undefined,
      source: "user",
    });
    if (!persisted.ok) {
      setPersistError(persisted.error);
      return;
    }
    setPersistError(null);
    refreshAfterPersist();
    setFeedbackNote(toStatus === "rejected" && !feedbackNote.trim() ? "Rejection recorded without an explicit reason (unknown)." : "");
  }

  if (!snapshot) {
    return <p className="text-sm text-[color:var(--af-text-muted)]">A carregar…</p>;
  }

  if (!job) {
    return (
      <ApplyFlowCard variant="muted" padding="md">
        <p className="text-sm text-[color:var(--af-text)]">{JOB_DECISION_V2_MISSING}</p>
        <Link href="/dashboard" className="mt-3 inline-block text-sm text-emerald-300 hover:text-emerald-200">
          {JOB_DECISION_V2_BACK}
        </Link>
      </ApplyFlowCard>
    );
  }

  return (
    <ApplyFlowSection eyebrow={JOB_DECISION_V2_EYEBROW} title={JOB_DECISION_V2_TITLE} description={JOB_DECISION_V2_HINT}>
      <p className="text-sm font-medium text-[color:var(--af-text)]">
        {job.title}
        {job.company ? ` · ${job.company}` : ""}
      </p>
      <div className="mt-2 flex flex-wrap gap-3 text-xs">
        <Link href="/dashboard" className="text-emerald-300 hover:text-emerald-200">
          {JOB_DECISION_V2_BACK}
        </Link>
        <Link href="/dashboard/analytics" className="text-emerald-300 hover:text-emerald-200">
          Analytics
        </Link>
      </div>

      {!decision ? (
        <ApplyFlowCard variant="warning" padding="md" className="mt-4">
          <p className="text-sm text-[color:var(--af-text)]">
            {needsResume ? JOB_DECISION_V2_NEED_RESUME : JOB_DECISION_V2_NO_TEXT}
          </p>
          {needsResume ? (
            <Link href="/dashboard" className="mt-3 inline-block text-sm text-emerald-300 hover:text-emerald-200">
              {JOB_DECISION_V2_BACK}
            </Link>
          ) : null}
        </ApplyFlowCard>
      ) : (
        <div className="mt-5 grid gap-4">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Career OS V2">
            {(Object.keys(JOB_DECISION_V2_TABS) as JobV2Tab[]).map((key) => (
              <ApplyFlowButton
                key={key}
                type="button"
                role="tab"
                variant={tab === key ? "outlineBrand" : "ghost"}
                size="sm"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  tab === key
                    ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-100"
                    : "border-[color:var(--af-border)] text-[color:var(--af-text-muted)]"
                }`}
              >
                {JOB_DECISION_V2_TABS[key]}
              </ApplyFlowButton>
            ))}
          </div>

          <ApplyFlowCard padding="md">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
              Outcome manual
            </p>
            <p className="mt-1 text-xs text-[color:var(--af-text-muted)]">
              Não infere rejection reason a partir de GAP. Sem motivo explícito, a categoria fica unknown.
            </p>
            {persistError ? <p className="mt-2 text-xs text-red-200">{persistError}</p> : null}
            {application ? (
              <div className="mt-2 grid gap-2">
                <p className="text-xs text-[color:var(--af-text-muted)]">{JOB_DECISION_V2_APPLICATION_READY}</p>
                {currentPipeline ? (
                  <p className="text-xs text-[color:var(--af-text)]">
                    {JOB_DECISION_V2_STATUS}: {APPLYFLOW_PIPELINE_STATUS_V2_LABELS_PT[currentPipeline]}
                  </p>
                ) : null}
                {application.status === "reviewing" ? (
                  <>
                    <p className="text-xs text-[color:var(--af-text)]">{JOB_DECISION_V2_MARK_SENT_HINT}</p>
                    <ApplyFlowButton
                      type="button"
                      variant="outlineBrand"
                      size="sm"
                      onClick={markApplicationSent}
                      className="w-fit rounded-md border-emerald-400/50 px-3 py-1 text-xs text-emerald-100"
                    >
                      {JOB_DECISION_V2_MARK_SENT}
                    </ApplyFlowButton>
                  </>
                ) : currentPipeline === "applied" ? (
                  <p className="text-xs text-emerald-200/90">{JOB_DECISION_V2_MARKED_SENT}</p>
                ) : null}
              </div>
            ) : (
              <div className="mt-3 grid gap-2">
                <p className="text-xs text-[color:var(--af-text)]">{JOB_DECISION_V2_NEED_APPLICATION}</p>
                <p className="text-xs text-[color:var(--af-text-muted)]">{JOB_DECISION_V2_CREATE_HINT}</p>
                <ApplyFlowButton
                  type="button"
                  variant="outlineBrand"
                  size="sm"
                  disabled={!decision}
                  onClick={createApplicationRecord}
                  className="w-fit rounded-md border-emerald-400/50 px-3 py-1 text-xs text-emerald-100"
                >
                  {JOB_DECISION_V2_CREATE_APPLICATION}
                </ApplyFlowButton>
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {(
                [
                  ["recruiter_contacted", "Response"],
                  ["screening", "Screening"],
                  ["technical", "Technical"],
                  ["final", "Final"],
                  ["offer", "Offer"],
                  ["hired", JOB_DECISION_V2_HIRED],
                  ["rejected", "Rejection"],
                  ["withdrawn", "Withdrawal"],
                ] as const
              ).map(([status, label]) => {
                const enabled =
                  Boolean(application && currentPipeline && canTransitionApplicationStatus(currentPipeline, status));
                return (
                  <ApplyFlowButton
                    key={status}
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => recordStatus(status)}
                    disabled={!enabled}
                    className="rounded-md border border-[color:var(--af-border)] px-2 py-1 text-xs text-[color:var(--af-text)] disabled:opacity-40"
                  >
                    {label}
                  </ApplyFlowButton>
                );
              })}
            </div>
            {lifecycleEvents.length > 0 ? (
              <div className="mt-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
                  {JOB_DECISION_V2_HISTORY}
                </p>
                <ul className="mt-2 grid gap-1 text-xs text-[color:var(--af-text)]">
                  {lifecycleEvents.map((item) => (
                    <li key={item.id}>
                      {formatLifecycleEventDate(item.occurredAt)} —{" "}
                      {item.toStatus ? APPLYFLOW_PIPELINE_STATUS_V2_LABELS_PT[item.toStatus] : item.type}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <input
              value={feedbackNote}
              onChange={(event) => setFeedbackNote(event.target.value)}
              placeholder="Motivo explícito / nota (opcional)"
              className="mt-3 w-full rounded-md border border-[color:var(--af-border)] bg-transparent px-2 py-1 text-sm"
            />
          </ApplyFlowCard>

          {tab === "overview" ? (
            <ApplyFlowCard padding="md">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
                {JOB_DECISION_V2_CURRENT_ANALYSIS}
              </p>
              <p className="mt-1 text-xs text-[color:var(--af-text-muted)]">{JOB_DECISION_V2_CURRENT_HINT}</p>
              {decision.decision === "needs_info" ? (
                <p className="mt-3 text-sm text-[color:var(--af-text)]">{JOB_DECISION_V2_INCOMPLETE}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <ApplyFlowBadge tone={decisionTone(decision.decision)}>
                  {JOB_DECISION_V2_LABELS[decision.decision]}
                </ApplyFlowBadge>
                <ApplyFlowBadge tone="intel">fit {decision.overall}/100</ApplyFlowBadge>
                <ApplyFlowBadge tone="neutral">risk {decision.eliminationRisk}</ApplyFlowBadge>
                <ApplyFlowBadge tone="neutral">upside {decision.careerUpside}</ApplyFlowBadge>
                <ApplyFlowBadge tone="neutral">hiring {decision.hiringProbability}</ApplyFlowBadge>
              </div>
              <ul className="mt-3 grid gap-1 text-sm text-[color:var(--af-text-muted)]">
                {decision.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
                {JOB_DECISION_V2_DIMENSIONS}
              </p>
              <ul className="mt-2 grid gap-1 text-sm text-[color:var(--af-text)]">
                {dimensions.map(([label, value]) => (
                  <li key={label} className="flex justify-between gap-4">
                    <span>{label}</span>
                    <span className="tabular-nums text-[color:var(--af-text-muted)]">{value}</span>
                  </li>
                ))}
              </ul>
              {showDivergentAnalyses && registeredAnalysis ? (
                <div className="mt-4 border-t border-[color:var(--af-border)] pt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
                    {JOB_DECISION_V2_AT_APPLY_ANALYSIS}
                  </p>
                  <p className="mt-1 text-sm text-[color:var(--af-text)]">
                    {registeredAnalysis.overallFit} · {JOB_DECISION_V2_LABELS[registeredAnalysis.decision]}
                  </p>
                  <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
                    {JOB_DECISION_V2_CURRENT_ANALYSIS}
                  </p>
                  <p className="mt-1 text-sm text-[color:var(--af-text)]">
                    {decision.overall} · {JOB_DECISION_V2_LABELS[decision.decision]}
                  </p>
                  <p className="mt-2 text-xs text-[color:var(--af-text-muted)]">{JOB_DECISION_V2_REGISTERED_PRESERVED}</p>
                </div>
              ) : registeredAnalysis ? (
                <p className="mt-4 text-xs text-[color:var(--af-text-muted)]">{JOB_DECISION_V2_REGISTERED_PRESERVED}</p>
              ) : null}
            </ApplyFlowCard>
          ) : null}

          {tab === "requirements" ? (
            <ApplyFlowCard padding="md">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
                {JOB_DECISION_V2_REQUIREMENTS}
              </p>
              <ul className="mt-2 grid gap-2">
                {decision.matches.map((match) => (
                  <li key={match.requirement.id} className="text-sm text-[color:var(--af-text)]">
                    <div className="flex flex-wrap items-center gap-2">
                      <ApplyFlowBadge tone={matchTone(match.status)}>{match.status}</ApplyFlowBadge>
                      <span>{match.requirement.label}</span>
                    </div>
                    <p className="mt-1 text-xs text-[color:var(--af-text-muted)]">{match.reason}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
                {JOB_DECISION_V2_GATES}
              </p>
              <ul className="mt-2 grid gap-1 text-sm text-[color:var(--af-text)]">
                {(pack?.gates ?? decision.gates).map((gate) => (
                  <li key={gate.id}>
                    {gate.label}: {JOB_DECISION_V2_GATE_RESULT_LABELS[gate.result] ?? gate.result} — {gate.reason}
                  </li>
                ))}
              </ul>
            </ApplyFlowCard>
          ) : null}

          {tab === "evidence" ? (
            <ApplyFlowCard padding="md">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
                {JOB_DECISION_V2_CLAIMS}
              </p>
              {decision.recommendedClaims.length === 0 ? (
                <p className="mt-2 text-sm text-[color:var(--af-text-muted)]">{JOB_DECISION_V2_CLAIMS_EMPTY}</p>
              ) : (
                <ul className="mt-2 grid gap-1 text-sm text-[color:var(--af-text)]">
                  {decision.recommendedClaims.map((item) => (
                    <li key={item.claim}>
                      {item.status}: {item.claim}
                    </li>
                  ))}
                </ul>
              )}
              {decision.candidateInputRequests.length > 0 ? (
                <div className="mt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
                    {JOB_DECISION_V2_INPUTS}
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--af-text-muted)]">{JOB_DECISION_V2_INPUTS_HINT}</p>
                  <ul className="mt-2 grid gap-2 text-sm text-[color:var(--af-text)]">
                    {decision.candidateInputRequests.map((item) => (
                      <li key={item.id}>
                        <p>{item.question}</p>
                        <p className="text-xs text-[color:var(--af-text-muted)]">{item.reason}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </ApplyFlowCard>
          ) : null}

          {tab === "application" && pack ? (
            pack.status === "blocked" ? (
              <ApplyFlowCard variant="warning" padding="md">
                <p className="text-sm text-[color:var(--af-text)]">
                  {pack.decision === "needs_info" ? JOB_DECISION_V2_PACK_INCOMPLETE : JOB_DECISION_V2_PACK_BLOCKED}
                </p>
                <p className="mt-2 text-xs text-[color:var(--af-text-muted)]">{pack.reason}</p>
              </ApplyFlowCard>
            ) : (
              <div className="grid gap-4">
                <ApplyFlowCard padding="md">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
                    Resume
                  </p>
                  <p className="mt-2 text-sm text-[color:var(--af-text)]">
                    {pack.resumeRecommendation?.variant.name} · {pack.resumeRecommendation?.strategy}
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--af-text-muted)]">{pack.resumeRecommendation?.reason}</p>
                  {pack.cvPersonalization?.headline ? (
                    <p className="mt-3 text-sm text-[color:var(--af-text)]">Headline: {pack.cvPersonalization.headline}</p>
                  ) : null}
                </ApplyFlowCard>
                <ApplyFlowCard padding="md">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
                    CV plan
                  </p>
                  <ul className="mt-2 grid gap-2 text-sm text-[color:var(--af-text)]">
                    {(pack.cvPersonalization?.experienceChanges ?? []).map((item) => (
                      <li key={item.proposed}>
                        {item.claimSafety}: {item.proposed}
                      </li>
                    ))}
                  </ul>
                </ApplyFlowCard>
                <ApplyFlowCard padding="md">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
                    Answers
                  </p>
                  <ul className="mt-2 grid gap-3 text-sm text-[color:var(--af-text)]">
                    {pack.applicationAnswers.map((item) => (
                      <li key={item.id}>
                        <p className="font-medium">{item.question}</p>
                        <p className="text-xs text-[color:var(--af-text-muted)]">{item.status}</p>
                        {item.recommendedAnswer ? <p className="mt-1">{item.recommendedAnswer}</p> : null}
                      </li>
                    ))}
                  </ul>
                </ApplyFlowCard>
                <ApplyFlowCard padding="md">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
                    Binary / claim audit
                  </p>
                  <ul className="mt-2 grid gap-1 text-sm text-[color:var(--af-text)]">
                    {pack.binaryQuestions.map((item) => (
                      <li key={item.id}>
                        {item.answer.toUpperCase()} — {item.question}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs text-[color:var(--af-text-muted)]">
                    Audit: {pack.claimAudit.safeCount} safe · {pack.claimAudit.defensibleCount} defensible ·{" "}
                    {pack.claimAudit.removedCount} removed
                  </p>
                  {pack.candidateInputs.length > 0 ? (
                    <ul className="mt-3 grid gap-2 text-sm text-[color:var(--af-text)]">
                      {pack.candidateInputs.map((item) => (
                        <li key={item.id}>{item.question}</li>
                      ))}
                    </ul>
                  ) : null}
                </ApplyFlowCard>
              </div>
            )
          ) : null}

          {tab === "networking" && pack ? (
            <JobDecisionV2NetworkingTab
              applicationId={application?.id}
              jobId={jobId}
              company={job.company}
              contacts={contacts}
              networkingPlan={pack.networkingPlan}
              onPersist={refreshAfterPersist}
            />
          ) : null}

          {tab === "interview" && pack ? (
            <ApplyFlowCard padding="md">
              <p className="text-sm text-[color:var(--af-text)]">{pack.interviewBrief?.decisionSummary}</p>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
                Strongest evidence
              </p>
              <ul className="mt-2 grid gap-1 text-sm">
                {(pack.interviewBrief?.strongestEvidence ?? []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
                Gaps
              </p>
              <ul className="mt-2 grid gap-1 text-sm">
                {(pack.interviewBrief?.gaps ?? []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--af-text-muted)]">
                Recommended cases
              </p>
              <ul className="mt-2 grid gap-2 text-sm">
                {(pack.interviewBrief?.recommendedCases ?? []).map((item) => (
                  <li key={item.project}>
                    {item.project} · {item.score} · {item.bestFor.join(", ")}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-[color:var(--af-text-muted)]">{JOB_DECISION_V2_LAB_HANDOFF}</p>
              <a
                href={getInterviewLabImportHandoffUrl()}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-sm text-emerald-300 hover:text-emerald-200"
              >
                {JOB_DECISION_V2_OPEN_LAB}
              </a>
            </ApplyFlowCard>
          ) : null}
        </div>
      )}
    </ApplyFlowSection>
  );
}
