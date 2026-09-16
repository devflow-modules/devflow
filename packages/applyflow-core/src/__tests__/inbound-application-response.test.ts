import { describe, expect, it } from "vitest";

import { analysisAtApplyFromOutcome, transitionApplicationStatus } from "../application-lifecycle.js";
import type { ApplyFlowApplication } from "../application-types.js";
import type { ApplicationOutcome } from "../career-analytics-types.js";
import {
  analyzeInboundResponses,
  classifyInboundResponse,
  detectInboundResponses,
  inboundEmailFromLocalEvidence,
  isSharedRecruitingHost,
  markResponseDetectionConfirmed,
  markResponseDetectionDismissed,
  matchInboundEmailToApplications,
  mergeInboundResponseDetections,
  prepareResponseDetectionConfirmation,
  previewInboundResponseAnalysis,
  suggestedStatusForInboundKind,
  summarizeInboundResponseAnalysis,
  type InboundEmail,
} from "../inbound-application-response.js";
import { createApplicationFromJob } from "../application-identity.js";
import type { JobDecisionV2 } from "../application-decision-types.js";
import type { ApplyFlowJob } from "../job-match-types.js";

const NOW = "2026-09-15T18:00:00.000Z";

const applyDecision: JobDecisionV2 = {
  scoringVersion: "v2",
  decision: "apply_normal",
  overall: 88,
  dimensions: {
    overall: 88,
    coreEngineering: 90,
    stack: 85,
    specialization: 80,
    seniority: 84,
    product: 92,
  },
  confidence: "high",
  hiringProbability: "high",
  careerUpside: "high",
  applicationCost: "medium",
  opportunityCost: "low",
  eliminationRisk: "low",
  priority: 86,
  matches: [],
  claims: [],
  recommendedClaims: [],
  gates: [],
  candidateInputRequests: [],
  reasons: ["fixture"],
};

function application(overrides?: Partial<ApplyFlowApplication>): ApplyFlowApplication {
  return {
    id: "app-bluelight",
    createdAt: "2026-09-12T16:53:30.919Z",
    updatedAt: "2026-09-15T03:04:24.620Z",
    source: "paste",
    status: "applied",
    companyName: "Bluelight Consulting",
    jobTitle: "Senior Product Engineer",
    jobUrl: "https://jobs.bluelightconsulting.com/senior-product-engineer",
    fitScore: 88,
    ...overrides,
  };
}

function outcome(applicationId: string, appliedAt = "2026-09-15T03:04:24.620Z"): ApplicationOutcome {
  return {
    applicationId,
    appliedAt,
    lastActivityAt: appliedAt,
    finalStatus: "applied",
    createdAt: appliedAt,
    updatedAt: appliedAt,
  };
}

function email(overrides?: Partial<InboundEmail>): InboundEmail {
  return {
    id: "mail-bluelight-1",
    senderDomain: "bluelightconsulting.com",
    receivedAt: NOW,
    ...overrides,
  };
}

describe("inbound response detection", () => {
  it("matches a strong company domain to the Bluelight application", () => {
    const result = matchInboundEmailToApplications({
      email: email(),
      applications: [application()],
      outcomes: [outcome("app-bluelight")],
    });
    expect(result.status).toBe("matched");
    expect(result.matches[0]?.application.id).toBe("app-bluelight");
    expect(result.matches[0]?.evidence.some((item) => item.includes("Bluelight"))).toBe(true);
  });

  it("returns UNMATCHED when no applied application corresponds", () => {
    const result = matchInboundEmailToApplications({
      email: email({ senderDomain: "unknown-corp.example" }),
      applications: [application()],
      outcomes: [outcome("app-bluelight")],
    });
    expect(result.status).toBe("unmatched");
    const analysis = analyzeInboundResponses({
      emails: [email({ id: "mail-unknown", senderDomain: "unknown-corp.example" })],
      applications: [application()],
      outcomes: [outcome("app-bluelight")],
    });
    expect(analysis.analyzedCount).toBe(1);
    expect(analysis.detections).toHaveLength(0);
    expect(analysis.discarded[0]?.reason).toBe("incomplete_metadata");
  });

  it("does not treat a shared ATS host as company identity without company evidence", () => {
    const first = application({
      id: "app-a",
      companyName: "Acme",
      jobUrl: "https://jobs.lever.co/acme/role-a",
    });
    const second = application({
      id: "app-b",
      companyName: "Beta",
      jobUrl: "https://jobs.lever.co/beta/role-b",
    });
    expect(isSharedRecruitingHost("jobs.lever.co")).toBe(true);
    const analysis = analyzeInboundResponses({
      emails: [email({ id: "mail-ats", senderDomain: "jobs.lever.co" })],
      applications: [first, second],
      outcomes: [outcome("app-a"), outcome("app-b")],
    });
    expect(analysis.analyzedCount).toBe(1);
    expect(analysis.detections).toHaveLength(0);
    expect(analysis.discarded[0]?.reason).toBe("incomplete_metadata");
    expect(first.status).toBe("applied");
    expect(second.status).toBe("applied");
  });

  it("classifies 'recebemos sua candidatura' as ACK, not screening", () => {
    const classified = classifyInboundResponse({
      subjectHint: "Recebemos sua candidatura para Senior Product Engineer",
    });
    expect(classified.kind).toBe("application_acknowledged");
    expect(suggestedStatusForInboundKind(classified.kind)).toBeNull();
    const detections = detectInboundResponses({
      emails: [
        email({
          subject: "Recebemos sua candidatura para Senior Product Engineer",
        }),
      ],
      applications: [application()],
      outcomes: [outcome("app-bluelight")],
    });
    expect(detections[0]?.classification).toBe("application_acknowledged");
    expect(detections[0]?.suggestedStatus).toBeNull();
    expect(detections[0]?.pipelineChange).toBe(false);
  });

  it("classifies an explicit interview invite as interview mapped conservatively to screening", () => {
    const detections = detectInboundResponses({
      emails: [email({ subject: "Interview invitation — 30 minutes" })],
      applications: [application()],
      outcomes: [outcome("app-bluelight")],
    });
    expect(detections[0]?.classification).toBe("interview");
    expect(detections[0]?.suggestedStatus).toBe("screening");
    expect(detections[0]?.state).toBe("pending_review");
    expect(detections[0]?.autoApply).toBe(false);
  });

  it("classifies explicit rejection without changing application status", () => {
    const apps = [application()];
    const detections = detectInboundResponses({
      emails: [email({ subject: "Unfortunately we will not be moving forward" })],
      applications: apps,
      outcomes: [outcome("app-bluelight")],
    });
    expect(detections[0]?.classification).toBe("rejection");
    expect(detections[0]?.suggestedStatus).toBe("rejected");
    expect(apps[0]?.status).toBe("applied");
    expect(detections[0]?.state).toBe("pending_review");
  });

  it("never mutates application status during detection", () => {
    const apps = [application({ status: "applied" })];
    detectInboundResponses({
      emails: [email({ subject: "Job offer from Bluelight" })],
      applications: apps,
      outcomes: [outcome("app-bluelight")],
    });
    expect(apps[0]?.status).toBe("applied");
  });

  it("requires human selection before confirming an unmatched or ambiguous detection", () => {
    const unmatched = detectInboundResponses({
      emails: [
        email({
          id: "u1",
          senderDomain: "nope.example",
          subject: "Unfortunately we will not be moving forward",
        }),
      ],
      applications: [application()],
      outcomes: [outcome("app-bluelight")],
    })[0]!;
    const unmatchedPrep = prepareResponseDetectionConfirmation({
      detection: unmatched,
      applications: [application()],
    });
    expect(unmatchedPrep.ok).toBe(false);
    if (!unmatchedPrep.ok) expect(unmatchedPrep.error).toBe("unmatched");

    const ambiguous = detectInboundResponses({
      emails: [
        email({
          id: "a1",
          senderDomain: "jobs.lever.co",
          subject: "Update for Acme and Beta candidates",
        }),
      ],
      applications: [
        application({ id: "app-a", companyName: "Acme", jobUrl: "https://jobs.lever.co/acme/a" }),
        application({ id: "app-b", companyName: "Beta", jobUrl: "https://jobs.lever.co/beta/b" }),
      ],
      outcomes: [outcome("app-a"), outcome("app-b")],
    })[0]!;
    const blockedAmbiguous = prepareResponseDetectionConfirmation({
      detection: ambiguous,
      applications: [
        application({ id: "app-a", companyName: "Acme", jobUrl: "https://jobs.lever.co/acme/a" }),
        application({ id: "app-b", companyName: "Beta", jobUrl: "https://jobs.lever.co/beta/b" }),
      ],
    });
    expect(blockedAmbiguous.ok).toBe(false);
    if (!blockedAmbiguous.ok) expect(blockedAmbiguous.error).toBe("ambiguous");

    const withSelection = prepareResponseDetectionConfirmation({
      detection: { ...ambiguous, applicationId: undefined },
      applications: [
        application({ id: "app-a", companyName: "Acme", jobUrl: "https://jobs.lever.co/acme/a" }),
        application({ id: "app-b", companyName: "Beta", jobUrl: "https://jobs.lever.co/beta/b" }),
      ],
      selectedApplicationId: "app-a",
      selectedStatus: "recruiter_contacted",
    });
    expect(withSelection.ok).toBe(true);
  });

  it("blocks an invalid lifecycle transition instead of applying it", () => {
    const rejected = application({ status: "rejected" });
    const detection = detectInboundResponses({
      emails: [email({ subject: "Interview invitation" })],
      applications: [rejected],
      outcomes: [{ ...outcome("app-bluelight"), finalStatus: "rejected" }],
    })[0];
    expect(detection).toBeDefined();
    if (!detection) return;
    const prepared = prepareResponseDetectionConfirmation({
      detection: { ...detection, applicationId: rejected.id, suggestedStatus: "screening" },
      applications: [rejected],
      outcomes: [{ ...outcome("app-bluelight"), finalStatus: "rejected" }],
      selectedApplicationId: rejected.id,
      selectedStatus: "screening",
    });
    expect(prepared.ok).toBe(false);
    if (!prepared.ok) expect(prepared.error).toBe("invalid_transition");
    expect(rejected.status).toBe("rejected");
  });

  it("does not duplicate detections for the same messageId", () => {
    const first = detectInboundResponses({
      emails: [email({ id: "gmail-abc" })],
      applications: [application()],
      outcomes: [outcome("app-bluelight")],
    });
    const second = detectInboundResponses({
      emails: [email({ id: "gmail-abc" })],
      applications: [application()],
      outcomes: [outcome("app-bluelight")],
      existing: first,
    });
    const merged = mergeInboundResponseDetections(first, second);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.emailId).toBe("gmail-abc");
  });

  it("keeps confirmed detections stable on resync and does not invent a second confirmation event id", () => {
    const pending = detectInboundResponses({
      emails: [email({ id: "gmail-abc", subject: "Interview invitation" })],
      applications: [application()],
      outcomes: [outcome("app-bluelight")],
    })[0]!;
    const confirmed = markResponseDetectionConfirmed(pending, "evt-1");
    const resync = detectInboundResponses({
      emails: [email({ id: "gmail-abc", subject: "Interview invitation" })],
      applications: [application()],
      outcomes: [outcome("app-bluelight")],
      existing: [confirmed],
    });
    expect(resync).toHaveLength(1);
    expect(resync[0]?.state).toBe("confirmed");
    expect(resync[0]?.confirmedEventId).toBe("evt-1");
  });

  it("dismiss does not change the application", () => {
    const apps = [application()];
    const pending = detectInboundResponses({
      emails: [email({ subject: "Interview invitation" })],
      applications: apps,
      outcomes: [outcome("app-bluelight")],
    })[0]!;
    const dismissed = markResponseDetectionDismissed(pending);
    expect(dismissed.state).toBe("dismissed");
    expect(apps[0]?.status).toBe("applied");
  });

  it("human confirmation is the only path that asks for a lifecycle transition", () => {
    const pending = detectInboundResponses({
      emails: [email({ subject: "Interview invitation" })],
      applications: [application()],
      outcomes: [outcome("app-bluelight")],
    })[0]!;
    expect(pending.state).toBe("pending_review");
    const prepared = prepareResponseDetectionConfirmation({
      detection: pending,
      applications: [application()],
      outcomes: [outcome("app-bluelight")],
    });
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;
    expect(prepared.toStatus).toBe("screening");
    expect(prepared.pipelineChange).toBe(true);
  });

  it("preserves analysisAtApply 88 APPLY NORMAL when a detection exists", () => {
    const job: ApplyFlowJob = {
      id: "job_mtylpciv_5tq43jcc",
      title: "Senior Product Engineer",
      company: "Bluelight Consulting",
      url: "https://jobs.bluelightconsulting.com/x",
      source: "paste",
      status: "reviewing",
      jobContext: { skills: ["React"] },
      createdAt: "2026-09-12T16:53:30.919Z",
      updatedAt: "2026-09-12T16:53:30.919Z",
    };
    const created = createApplicationFromJob({
      job,
      decision: applyDecision,
      now: new Date("2026-09-12T16:53:30.919Z"),
      applicationId: "app_mtymjjc7_job_mtylpciv_5tq43jcc",
    });
    const sent = transitionApplicationStatus({
      application: created.application,
      outcome: created.outcome,
      toStatus: "applied",
      now: new Date("2026-09-12T17:34:43.964Z"),
    });
    expect(sent.ok).toBe(true);
    if (!sent.ok) return;
    detectInboundResponses({
      emails: [email({ subject: "Interview invitation" })],
      applications: [sent.application],
      outcomes: [sent.outcome],
    });
    const atApply = analysisAtApplyFromOutcome(sent.outcome);
    expect(atApply).toEqual({
      score: 88,
      recommendation: "apply_normal",
      analyzedAt: "2026-09-12T16:53:30.919Z",
    });
    expect(sent.application.status).toBe("applied");
  });

  it("builds a local inbound email without inventing a company reply", () => {
    const local = inboundEmailFromLocalEvidence({
      senderDomain: "bluelightconsulting.com",
      occurredAt: NOW,
      subject: "Interview invitation",
    });
    expect(local?.id.startsWith("local-")).toBe(true);
    expect(local?.subject).toBe("Interview invitation");
  });

  it("does not turn a LinkedIn job alert into an actionable match or ACK", () => {
    const tempo = application({
      id: "app-tempo",
      companyName: "Tempo",
      jobTitle: "Full-Stack Engineer (Remote)",
      jobUrl: "https://jobs.ashbyhq.com/tempo/role",
    });
    const analysis = analyzeInboundResponses({
      emails: [
        email({
          id: "mail-linkedin-alert",
          senderDomain: "linkedin.com",
          subject: "Jobs you may like this week",
        }),
      ],
      applications: [tempo],
      outcomes: [outcome("app-tempo")],
    });
    expect(
      matchInboundEmailToApplications({
        email: email({ senderDomain: "linkedin.com", subject: "Jobs you may like this week" }),
        applications: [tempo],
        outcomes: [outcome("app-tempo")],
      }).status,
    ).toBe("unmatched");
    expect(classifyInboundResponse({ senderDomain: "linkedin.com", subjectHint: "Jobs you may like this week" }).kind).toBe(
      "other",
    );
    expect(analysis.detections).toHaveLength(0);
    expect(analysis.discarded).toEqual([{ emailId: "mail-linkedin-alert", reason: "job_alert" }]);
  });

  it("does not ACK an Indeed job alert just because a similar title appears", () => {
    const witi = application({
      id: "app-witi",
      companyName: "WiTi",
      jobTitle: "Full-Stack Developer Foco Front-end",
      jobUrl: "https://www.getonbrd.com/empleos/programacion/full-stack-developer-senior-witi-remote",
    });
    const analysis = analyzeInboundResponses({
      emails: [
        email({
          id: "mail-indeed-alert",
          senderDomain: "jobalert.indeed.com",
          subject: "Full-Stack Developer jobs near you",
        }),
      ],
      applications: [witi],
      outcomes: [outcome("app-witi")],
    });
    expect(classifyInboundResponse({ senderDomain: "jobalert.indeed.com", subjectHint: "Full-Stack Developer jobs near you" }).kind).not.toBe(
      "application_acknowledged",
    );
    expect(analysis.detections).toHaveLength(0);
    expect(analysis.discarded[0]?.reason).toBe("job_alert");
  });

  it("keeps a real ATS acknowledgement when company evidence is present", () => {
    const detections = detectInboundResponses({
      emails: [
        email({
          id: "mail-ats-ack",
          senderDomain: "jobs.greenhouse.io",
          subject: "Thank you for applying to Bluelight Consulting",
        }),
      ],
      applications: [application({ jobUrl: "https://jobs.greenhouse.io/bluelightconsulting/123" })],
      outcomes: [outcome("app-bluelight")],
    });
    expect(detections).toHaveLength(1);
    expect(detections[0]?.matchStatus).toBe("matched");
    expect(detections[0]?.applicationId).toBe("app-bluelight");
    expect(detections[0]?.classification).toBe("application_acknowledged");
    expect(detections[0]?.suggestedStatus).toBeNull();
    expect(detections[0]?.state).toBe("pending_review");
  });

  it("matches a direct company reply without treating ATS alerts as acknowledgements", () => {
    const detections = detectInboundResponses({
      emails: [
        email({
          id: "mail-company",
          senderDomain: "bluelightconsulting.com",
          subject: "Interview invitation — 30 minutes",
        }),
      ],
      applications: [application()],
      outcomes: [outcome("app-bluelight")],
    });
    expect(detections[0]?.matchStatus).toBe("matched");
    expect(detections[0]?.classification).toBe("interview");
    expect(detections[0]?.matchEvidence.some((item) => item.includes("ATS"))).toBe(false);
  });

  it("does not match two companies on the same ATS from the shared host alone", () => {
    const first = application({
      id: "app-tempo",
      companyName: "Tempo",
      jobUrl: "https://jobs.ashbyhq.com/tempo/role-a",
    });
    const second = application({
      id: "app-witi",
      companyName: "WiTi Labs",
      jobUrl: "https://jobs.ashbyhq.com/witi/role-b",
    });
    expect(isSharedRecruitingHost("jobs.ashbyhq.com")).toBe(true);
    const result = matchInboundEmailToApplications({
      email: email({ senderDomain: "jobs.ashbyhq.com", subject: "Your application update" }),
      applications: [first, second],
      outcomes: [outcome("app-tempo"), outcome("app-witi")],
    });
    const analysis = analyzeInboundResponses({
      emails: [email({ id: "mail-ashby-host", senderDomain: "jobs.ashbyhq.com", subject: "Your application update" })],
      applications: [first, second],
      outcomes: [outcome("app-tempo"), outcome("app-witi")],
    });
    expect(result.status).toBe("unmatched");
    expect(result.matches).toHaveLength(0);
    expect(analysis.analyzedCount).toBe(1);
    expect(analysis.detections).toHaveLength(0);
    expect(analysis.discarded[0]?.reason).toBe("irrelevant_unmatched");
  });

  it("matches a legitimate ATS reply when company evidence identifies one application", () => {
    const first = application({
      id: "app-tempo",
      companyName: "Tempo",
      jobUrl: "https://jobs.ashbyhq.com/tempo/role-a",
    });
    const second = application({
      id: "app-witi",
      companyName: "WiTi Labs",
      jobUrl: "https://jobs.ashbyhq.com/witi/role-b",
    });
    const analysis = analyzeInboundResponses({
      emails: [
        email({
          id: "mail-ashby-tempo",
          senderDomain: "jobs.ashbyhq.com",
          subject: "Thank you for applying to Tempo",
        }),
      ],
      applications: [first, second],
      outcomes: [outcome("app-tempo"), outcome("app-witi")],
    });
    expect(analysis.analyzedCount).toBe(1);
    expect(analysis.discarded).toHaveLength(0);
    expect(analysis.detections).toHaveLength(1);
    expect(analysis.detections[0]?.matchStatus).toBe("matched");
    expect(analysis.detections[0]?.applicationId).toBe("app-tempo");
    expect(analysis.detections[0]?.classification).toBe("application_acknowledged");
    expect(analysis.detections[0]?.state).toBe("pending_review");
  });

  it("keeps two same-ATS applications ambiguous when company evidence matches both", () => {
    const first = application({
      id: "app-a",
      companyName: "Acme",
      jobUrl: "https://jobs.lever.co/acme/role-a",
    });
    const second = application({
      id: "app-b",
      companyName: "Beta",
      jobUrl: "https://jobs.lever.co/beta/role-b",
    });
    const result = matchInboundEmailToApplications({
      email: email({ senderDomain: "jobs.lever.co", subject: "Update for Acme and Beta candidates" }),
      applications: [first, second],
      outcomes: [outcome("app-a"), outcome("app-b")],
    });
    expect(result.status).toBe("ambiguous");
    expect(result.matches.map((item) => item.application.id)).toEqual(["app-a", "app-b"]);
  });

  it("does not create a pending detection for an irrelevant unmatched message", () => {
    const analysis = analyzeInboundResponses({
      emails: [
        email({
          id: "mail-newsletter",
          senderDomain: "news.example",
          subject: "Weekly product digest",
        }),
      ],
      applications: [application()],
      outcomes: [outcome("app-bluelight")],
    });
    expect(analysis.analyzedCount).toBe(1);
    expect(analysis.detections).toHaveLength(0);
    expect(analysis.discarded[0]).toEqual({ emailId: "mail-newsletter", reason: "irrelevant_unmatched" });
  });

  it("keeps an unmatched explicit rejection for human review", () => {
    const detections = detectInboundResponses({
      emails: [
        email({
          id: "mail-unknown-reject",
          senderDomain: "hiring.example",
          subject: "Unfortunately we will not be moving forward",
        }),
      ],
      applications: [application()],
      outcomes: [outcome("app-bluelight")],
    });
    expect(detections).toHaveLength(1);
    expect(detections[0]?.matchStatus).toBe("unmatched");
    expect(detections[0]?.applicationId).toBeUndefined();
    expect(detections[0]?.classification).toBe("rejection");
    expect(detections[0]?.state).toBe("pending_review");
  });

  it("does not infer ACK or a match from incomplete metadata", () => {
    const tempo = application({
      id: "app-tempo",
      companyName: "Tempo",
      jobUrl: "https://jobs.ashbyhq.com/tempo/role",
    });
    const classified = classifyInboundResponse({ senderDomain: "linkedin.com" });
    expect(classified.kind).not.toBe("application_acknowledged");
    const analysis = analyzeInboundResponses({
      emails: [email({ id: "mail-meta-only", senderDomain: "linkedin.com" })],
      applications: [tempo],
      outcomes: [outcome("app-tempo")],
    });
    expect(analysis.detections).toHaveLength(0);
    expect(analysis.discarded[0]?.reason).toBe("incomplete_metadata");
  });

  it("does not duplicate detections when the same message is reprocessed", () => {
    const emails = [
      email({
        id: "gmail-same",
        subject: "Interview invitation",
      }),
    ];
    const first = detectInboundResponses({
      emails,
      applications: [application()],
      outcomes: [outcome("app-bluelight")],
    });
    const second = detectInboundResponses({
      emails,
      applications: [application()],
      outcomes: [outcome("app-bluelight")],
      existing: first,
    });
    const merged = mergeInboundResponseDetections(first, second);
    expect(first).toHaveLength(1);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.emailId).toBe("gmail-same");
    expect(merged[0]?.id).toBe(first[0]?.id);
    expect(merged[0]?.state).toBe("pending_review");
  });

  it("does not change an existing pending review state when the same message is reprocessed", () => {
    const emails = [email({ id: "gmail-pending", subject: "Interview invitation" })];
    const first = detectInboundResponses({
      emails,
      applications: [application()],
      outcomes: [outcome("app-bluelight")],
      now: new Date("2026-09-15T18:00:00.000Z"),
    });
    expect(first[0]?.state).toBe("pending_review");
    expect(first[0]?.classification).toBe("interview");
    const reclassifiedIncoming = detectInboundResponses({
      emails: [email({ id: "gmail-pending", subject: "Unfortunately we will not be moving forward" })],
      applications: [application()],
      outcomes: [outcome("app-bluelight")],
      existing: first,
      now: new Date("2026-09-15T19:00:00.000Z"),
    });
    const merged = mergeInboundResponseDetections(first, reclassifiedIncoming);
    expect(reclassifiedIncoming).toHaveLength(1);
    expect(reclassifiedIncoming[0]?.state).toBe("pending_review");
    expect(reclassifiedIncoming[0]?.classification).toBe("interview");
    expect(reclassifiedIncoming[0]?.detectedAt).toBe(first[0]?.detectedAt);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.state).toBe("pending_review");
    expect(merged[0]?.classification).toBe("interview");
    expect(merged[0]?.id).toBe(first[0]?.id);
  });

  it("still allows human confirmation to replace a pending detection", () => {
    const pending = detectInboundResponses({
      emails: [email({ id: "gmail-confirm", subject: "Interview invitation" })],
      applications: [application()],
      outcomes: [outcome("app-bluelight")],
    })[0]!;
    const confirmed = markResponseDetectionConfirmed(pending, "evt-confirm");
    const merged = mergeInboundResponseDetections([pending], [confirmed]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.state).toBe("confirmed");
    expect(merged[0]?.confirmedEventId).toBe("evt-confirm");
  });

  it("does not collide detections that belong to distinct email identities", () => {
    const analysis = analyzeInboundResponses({
      emails: [
        email({ id: "account-a-mail-1", subject: "Interview invitation" }),
        email({ id: "account-b-mail-2", subject: "Interview invitation" }),
      ],
      applications: [application()],
      outcomes: [outcome("app-bluelight")],
    });
    expect(analysis.analyzedCount).toBe(2);
    expect(analysis.detections).toHaveLength(2);
    expect(analysis.detections.map((item) => item.emailId).sort()).toEqual(["account-a-mail-1", "account-b-mail-2"]);
    const reused = analyzeInboundResponses({
      emails: [
        email({ id: "account-a-mail-1", subject: "Interview invitation" }),
        email({ id: "account-b-mail-2", subject: "Interview invitation" }),
      ],
      applications: [application()],
      outcomes: [outcome("app-bluelight")],
      existing: analysis.detections,
    });
    const summary = summarizeInboundResponseAnalysis(reused, analysis.detections);
    expect(summary.analyzedCount).toBe(2);
    expect(summary.detectionsCreated).toBe(0);
    expect(summary.detectionsReused).toBe(2);
    expect(summary.discardedCount).toBe(0);
    expect(reused.detections.map((item) => item.state)).toEqual(["pending_review", "pending_review"]);
  });

  it("counts analyzed messages separately from discarded and newly created detections", () => {
    const existing = detectInboundResponses({
      emails: [email({ id: "mail-existing", subject: "Interview invitation" })],
      applications: [application()],
      outcomes: [outcome("app-bluelight")],
    });
    const analysis = analyzeInboundResponses({
      emails: [
        email({ id: "mail-existing", subject: "Interview invitation" }),
        email({ id: "mail-new", subject: "Interview invitation" }),
        email({ id: "mail-noise", senderDomain: "news.example", subject: "Weekly product digest" }),
      ],
      applications: [application()],
      outcomes: [outcome("app-bluelight")],
      existing,
    });
    const summary = summarizeInboundResponseAnalysis(analysis, existing);
    expect(analysis.analyzedCount).toBe(3);
    expect(summary.analyzedCount).toBe(3);
    expect(summary.detectionsEligible).toBe(2);
    expect(summary.detectionsCreated).toBe(1);
    expect(summary.detectionsReused).toBe(1);
    expect(summary.discardedCount).toBe(1);
    expect(summary.discardedByReason.irrelevant_unmatched).toBe(1);
    expect(analysis.detections.find((item) => item.emailId === "mail-new")?.state).toBe("pending_review");
    expect(analysis.detections.find((item) => item.emailId === "mail-existing")?.id).toBe(existing[0]?.id);
  });

  it("previews classifier decisions without treating reused detections as new matches", () => {
    const existing = detectInboundResponses({
      emails: [email({ id: "mail-existing", subject: "Interview invitation" })],
      applications: [application()],
      outcomes: [outcome("app-bluelight")],
    });
    const preview = previewInboundResponseAnalysis({
      source: "synthetic",
      emails: [
        email({ id: "mail-existing", subject: "Interview invitation" }),
        email({
          id: "mail-ashby-host",
          senderDomain: "jobs.ashbyhq.com",
          subject: "Your application update",
        }),
        email({
          id: "mail-ashby-tempo",
          senderDomain: "jobs.ashbyhq.com",
          subject: "Thank you for applying to Tempo",
        }),
      ],
      applications: [
        application({
          id: "app-tempo",
          companyName: "Tempo",
          jobUrl: "https://jobs.ashbyhq.com/tempo/role-a",
        }),
        application(),
      ],
      outcomes: [outcome("app-tempo"), outcome("app-bluelight")],
      existing,
    });
    expect(preview.source).toBe("synthetic");
    expect(preview.persisted).toBe(false);
    expect(preview.summary.analyzedCount).toBe(3);
    expect(preview.summary.detectionsCreated).toBe(1);
    expect(preview.summary.detectionsReused).toBe(1);
    expect(preview.summary.discardedCount).toBe(1);
    expect(preview.decisions).toEqual([
      { emailId: "mail-existing", outcome: "reused", matchStatus: "matched", classification: "interview" },
      { emailId: "mail-ashby-host", outcome: "discarded", reason: "irrelevant_unmatched" },
      {
        emailId: "mail-ashby-tempo",
        outcome: "created",
        matchStatus: "matched",
        classification: "application_acknowledged",
      },
    ]);
  });
});
