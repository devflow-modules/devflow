import { describe, expect, it } from "vitest";

import { createApplicationPackV2 } from "../application-pack-v2.js";
import { applyBinaryKnockouts, recommendBinaryAnswer } from "../binary-answers.js";
import { gustavoProfile } from "../candidate-profile.js";
import {
  createApplyFlowCareerBundleV2,
  parseApplyFlowCareerBundle,
  serializeApplyFlowCareerBundleV2,
} from "../career-bundle-v2.js";
import { recommendCases } from "../case-match.js";
import { sanitizeTextWithClaimAudit } from "../claim-safety.js";
import { recommendCompensation } from "../compensation.js";
import { buildCandidateEvidence } from "../evidence-from-profile.js";
import { gustavoEvidenceSeed } from "../evidence-seed.js";
import { evaluateJobDecisionV2 } from "../evaluate-job-decision-v2.js";
import { parseApplyFlowApplicationsImport } from "../imported-application-schema.js";
import { buildFollowUpPlan } from "../follow-up-plan.js";
import { getDueFollowUps } from "../follow-up-queue.js";
import { buildNetworkingPlan } from "../networking-plan.js";
import { validateCandidateProfile } from "../profile-schema.js";
import { addResumeVariant, createResumeLibraryFromProfile } from "../resume-library.js";

const NOW = new Date("2026-09-09T12:00:00.000Z");
const evidence = buildCandidateEvidence(gustavoProfile, gustavoEvidenceSeed, NOW);

const REACT_NEXT_NODE = `
Senior Product Engineer — Remote SaaS

We need a Senior Product Engineer who owns discovery and delivery end-to-end.

Requirements:
- React, Next.js, TypeScript, Node.js
- PostgreSQL and product-oriented frontend architecture
- Ownership of 0-to-1 SaaS products
- Comfortable communicating in English
`;

const PRODUCT_ENGINEER_AI = `
Product Engineer + AI — Remote

Core role is Product Engineer with React, Next.js, TypeScript and Node.js.
You will also help with AI features.

Requirements:
- Product engineer with ownership and SaaS experience
- React, Next.js, TypeScript, Node.js, PostgreSQL
- 3+ years architecting AWS
- Production GenAI / LLM system
- AI Agents
`;

const AWS_JOB = `
Backend role with professional AWS experience required.
Salary range 4500-6000.
`;

function packFor(jobText: string, extras?: { profile?: typeof gustavoProfile; binaries?: { question: string; mandatory?: boolean }[] }) {
  const profile = extras?.profile ?? gustavoProfile;
  const ev = extras?.profile ? buildCandidateEvidence(profile, gustavoEvidenceSeed, NOW) : evidence;
  const decision = evaluateJobDecisionV2({ jobText, evidence: ev, profile, jobId: "job_p1" });
  return createApplicationPackV2({
    jobId: "job_p1",
    jobText,
    jobTitle: "Product Engineer",
    companyName: "Acme",
    profile,
    evidence: ev,
    decision,
    binaryQuestions: extras?.binaries,
    now: NOW,
  });
}

describe("P1 Application Pack V2", () => {
  it("1. CV personalization for React/Next/Node keeps only SAFE/DEFENSIBLE claims", () => {
    const pack = packFor(REACT_NEXT_NODE);
    expect(pack.status).toBe("ready");
    expect(pack.decision).not.toBe("skip");
    const changes = [...(pack.cvPersonalization?.experienceChanges ?? []), ...(pack.cvPersonalization?.skillsChanges ?? [])];
    expect(changes.length).toBeGreaterThan(0);
    expect(changes.every((item) => item.claimSafety === "safe" || item.claimSafety === "defensible")).toBe(true);
    expect(pack.claimAudit.finalSafe.every((item) => item.status !== "remove")).toBe(true);
    expect(pack.cvPersonalization?.removedClaims.some((item) => /aws|ai agents/i.test(item))).toBe(false);
  });

  it("2. AWS gap is forbidden on the CV and audited as REMOVE", () => {
    const pack = packFor(PRODUCT_ENGINEER_AI);
    expect(pack.resumeRecommendation?.forbiddenKeywords.some((item) => /aws/i.test(item))).toBe(true);
    const proposed = [
      pack.cvPersonalization?.headline,
      pack.cvPersonalization?.summary,
      ...(pack.cvPersonalization?.experienceChanges ?? []).map((item) => item.proposed),
      ...(pack.cvPersonalization?.skillsChanges ?? []).map((item) => item.proposed),
    ]
      .filter(Boolean)
      .join("\n");
    expect(proposed.toLowerCase()).not.toMatch(/professional aws experience|architecting aws|aws architect/);
    expect(pack.cvPersonalization?.removedClaims.some((item) => /aws/i.test(item))).toBe(true);
    const awsAnswer = pack.applicationAnswers.find((item) => item.questionType === "aws");
    expect(awsAnswer?.recommendedAnswer).toMatch(/Docker, GitHub Actions, Vercel and Railway rather than AWS/);
    expect(awsAnswer?.recommendedAnswer).not.toMatch(/strong AWS experience/i);
  });

  it("3. automation is not converted into AI Agent experience", () => {
    const pack = packFor(PRODUCT_ENGINEER_AI);
    const ai = pack.applicationAnswers.find((item) => item.questionType === "ai_llm_agents");
    expect(ai?.recommendedAnswer).toMatch(/not built production AI Agents/i);
    expect(ai?.recommendedAnswer).not.toMatch(/I have built production AI Agents/i);
    const invented = sanitizeTextWithClaimAudit(
      "I converted my Python automation into production AI Agents for this role.",
      evidence,
    );
    expect(invented.text).not.toMatch(/production AI Agents/i);
    expect(invented.audit.removedCount).toBeGreaterThan(0);
  });

  it("4. mandatory binary knockout can fail the gate and force SKIP", () => {
    const decision = evaluateJobDecisionV2({
      jobText: PRODUCT_ENGINEER_AI,
      evidence,
      profile: gustavoProfile,
      jobId: "job_bin",
    });
    expect(decision.decision).not.toBe("skip");
    const binary = recommendBinaryAnswer({
      question: "Have you built production AI Agents?",
      mandatory: true,
      profile: gustavoProfile,
      evidence,
      decision,
    });
    expect(binary.answer).toBe("no");
    expect(binary.blocking).toBe(true);
    const knocked = applyBinaryKnockouts({
      decision: decision.decision,
      gates: decision.gates,
      binaries: [binary],
    });
    expect(knocked.decision).toBe("skip");
    expect(knocked.gates.some((item) => item.type === "binary_knockout" && item.result === "fail" && item.required)).toBe(
      true,
    );
    const pack = packFor(PRODUCT_ENGINEER_AI, {
      binaries: [{ question: "Have you built production AI Agents?", mandatory: true }],
    });
    expect(pack.status).toBe("blocked");
    expect(pack.decision).toBe("skip");
    expect(pack.resumeRecommendation).toBeUndefined();
    expect(pack.applicationAnswers).toEqual([]);
  });

  it("5. missing availability generates NEEDS_CANDIDATE_INPUT", () => {
    const profile = validateCandidateProfile({
      ...gustavoProfile,
      answerBank: { ...gustavoProfile.answerBank, availability: "" },
      facts: { ...gustavoProfile.facts, availability: undefined },
    });
    const pack = packFor(REACT_NEXT_NODE, { profile });
    const availability = pack.applicationAnswers.find((item) => item.questionType === "availability");
    expect(availability?.status).toBe("needs_candidate_input");
    expect(pack.candidateInputs.some((item) => /disponibilidade/i.test(item.question))).toBe(true);
  });

  it("6. published range 4500–6000 is not auto-selected as the floor because of gaps", () => {
    const noPref = validateCandidateProfile({
      ...gustavoProfile,
      salary: { ...gustavoProfile.salary, usdMonthly: "not specified" },
    });
    const { recommendation, candidateInput } = recommendCompensation({
      jobText: AWS_JOB,
      profile: noPref,
      decision: evaluateJobDecisionV2({ jobText: AWS_JOB, evidence, profile: noPref, jobId: "job_sal" }),
      jobId: "job_sal",
    });
    expect(recommendation.publishedMin).toBe(4500);
    expect(recommendation.publishedMax).toBe(6000);
    expect(recommendation.target).toBeUndefined();
    expect(recommendation.floor).toBeUndefined();
    expect(recommendation.needsCandidateInput).toBe(true);
    expect(candidateInput).toBeDefined();
    expect(recommendation.reasoning.join(" ")).toMatch(/do not invent|not auto-select|Published minimum/i);

    const withPref = recommendCompensation({
      jobText: "Product Engineer. Salary range 4500-6000. React Next.js.",
      profile: gustavoProfile,
      decision: evaluateJobDecisionV2({
        jobText: PRODUCT_ENGINEER_AI,
        evidence,
        profile: gustavoProfile,
        jobId: "job_sal2",
      }),
    });
    expect(withPref.recommendation.target).not.toBe(4500);
    expect(withPref.recommendation.publishedMin).toBe(4500);
  });

  it("7. Product Engineer stretch can put engineering leadership before recruiter", () => {
    const decision = evaluateJobDecisionV2({
      jobText: PRODUCT_ENGINEER_AI,
      evidence,
      profile: gustavoProfile,
      jobId: "job_net",
    });
    const plan = buildNetworkingPlan({
      jobText: PRODUCT_ENGINEER_AI,
      decision: { ...decision, decision: "apply_stretch", careerUpside: "very_high" },
      evidence,
      companyName: "Acme",
      roleTitle: "Product Engineer",
    });
    expect(plan.firstContact).toBe("engineering_manager");
    expect(plan.recommendedOrder.indexOf("engineering_manager")).toBeLessThan(plan.recommendedOrder.indexOf("recruiter"));
    expect(plan.reason).toMatch(/engineering leadership before recruiter/i);
  });

  it("8. Claim audit strips unsupported claims from the final text", () => {
    const result = sanitizeTextWithClaimAudit(
      "I ship React and Next.js products. I have strong AWS experience. Docker is part of my deployment path.",
      evidence,
    );
    expect(result.audit.removedCount).toBeGreaterThan(0);
    expect(result.text).not.toMatch(/strong AWS experience/i);
    expect(result.text).toMatch(/React/i);
    expect(result.audit.finalSafe.every((item) => item.status !== "remove")).toBe(true);
  });

  it("9. V1 applications still import and V2 bundles round-trip without dropping extras", () => {
    const v1 = parseApplyFlowApplicationsImport([
      {
        id: "app-1",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
        status: "reviewing",
        source: "linkedin",
        customLegacyField: "keep-me-out-of-v1-record",
      },
    ]);
    expect(v1.ok).toBe(true);
    if (!v1.ok) return;

    const migrated = parseApplyFlowCareerBundle({ version: 1, applications: v1.applications, mystery: { keep: true } });
    expect(migrated.ok).toBe(true);
    if (!migrated.ok) return;
    expect(migrated.source).toBe("v1-applications");
    expect(migrated.bundle.applications[0]?.id).toBe("app-1");
    expect(migrated.bundle.extras?.mystery).toEqual({ keep: true });

    const original = createApplyFlowCareerBundleV2({
      profile: gustavoProfile,
      evidence,
      applications: [{ ...v1.applications[0]!, v2: { decision: "apply_stretch", priority: 72 } }],
      contacts: [
        {
          id: "c1",
          name: "Alex Recruiter",
          type: "recruiter",
          status: "not_contacted",
          createdAt: NOW.toISOString(),
          updatedAt: NOW.toISOString(),
        },
      ],
      interactions: [],
      candidateInputs: [],
      extras: { futureField: "preserved" },
    });
    const serialized = serializeApplyFlowCareerBundleV2(original);
    const again = parseApplyFlowCareerBundle(serialized);
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.bundle.version).toBe(2);
    expect(again.bundle.contacts).toHaveLength(1);
    expect(again.bundle.applications[0]?.v2?.decision).toBe("apply_stretch");
    expect(again.bundle.extras?.futureField).toBe("preserved");
    expect(again.bundle.profile?.name).toBe(gustavoProfile.name);
  });

  it("10. Interview case selection depends on the question", () => {
    const ownership = recommendCases({ evidence, query: "ownership multi-tenancy architecture integrations" });
    const python = recommendCases({ evidence, query: "Python automation failure handling" });
    const client = recommendCases({ evidence, query: "real client user-facing external integration" });
    expect(ownership[0]?.project).toMatch(/WhatsApp/i);
    expect(python[0]?.project).toMatch(/Mavvitech/i);
    expect(client[0]?.project).toMatch(/Braza/i);
    expect(ownership[0]?.project).not.toBe(python[0]?.project);
  });

  it("uses the real resume library variant id instead of profile-default", () => {
    const library = createResumeLibraryFromProfile(gustavoProfile, { now: NOW, id: "rv_product", name: "Product Engineer" });
    const added = addResumeVariant(library, {
      profile: gustavoProfile,
      name: "Frontend React/Next.js",
      id: "rv_frontend",
      now: NOW,
    });
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    const decision = evaluateJobDecisionV2({ jobText: REACT_NEXT_NODE, evidence, profile: gustavoProfile, jobId: "job_p1" });
    const withoutLibrary = createApplicationPackV2({
      jobId: "job_p1",
      jobText: REACT_NEXT_NODE,
      profile: gustavoProfile,
      evidence,
      decision,
      now: NOW,
    });
    const withLibrary = createApplicationPackV2({
      jobId: "job_p1",
      jobText: REACT_NEXT_NODE,
      profile: gustavoProfile,
      evidence,
      decision,
      resumeLibrary: added.library,
      now: NOW,
    });
    expect(withoutLibrary.resumeRecommendation?.variant.id).toBe("profile-default");
    expect(withLibrary.resumeRecommendation?.variant.id).not.toBe("profile-default");
    expect(["rv_product", "rv_frontend"]).toContain(withLibrary.resumeRecommendation?.variant.id);
  });

  it("follow-up queue is deterministic and does not send", () => {
    const decision = evaluateJobDecisionV2({
      jobText: REACT_NEXT_NODE,
      evidence,
      profile: gustavoProfile,
      jobId: "job_fu",
    });
    const networking = buildNetworkingPlan({
      jobText: REACT_NEXT_NODE,
      decision,
      evidence,
    });
    const plan = buildFollowUpPlan({ networking });
    const due = getDueFollowUps({
      now: new Date("2026-09-09T15:00:00.000Z"),
      contacts: [
        {
          id: "c-em",
          name: "Sam",
          type: networking.firstContact,
          status: "connection_requested",
          createdAt: "2026-09-09T12:00:00.000Z",
          updatedAt: "2026-09-09T12:00:00.000Z",
          lastContactAt: "2026-09-09T12:00:00.000Z",
        },
      ],
      interactions: [],
      plan,
    });
    expect(due).toHaveLength(1);
    expect(due[0]?.bucket).toBe("today");
    expect(due[0]?.contactId).toBe("c-em");
  });
});
