import { describe, expect, it } from "vitest";

import {
  CONTACT_CONFIDENCE_LEVELS,
  CONTACT_TYPES,
  canMarkOutreachReady,
  defaultFollowUpAt,
  dismissOutreachFollowUp,
  effectiveOutreachStatus,
  importOpportunityPipeline,
  markOutreachReady,
  markOutreachSent,
  networkingIndicatorLabel,
  outreachNeverAutoSends,
  reevaluateApplyFlowJobMatch,
  recordOutreachReply,
  selectNetworkingQueue,
  type ApplyFlowJob,
  type Contact,
} from "../index.js";
import { gustavoProfile } from "../candidate-profile.js";

const NOW = new Date("2026-10-07T12:00:00.000Z");

function job(overrides: Partial<ApplyFlowJob> & Pick<ApplyFlowJob, "id" | "title">): ApplyFlowJob {
  return {
    company: "Example",
    source: "json",
    status: "reviewing",
    jobContext: { skills: [] },
    jobMatch: {
      score: 90,
      decision: "apply",
      matchedSkills: [],
      missingSkills: [],
      evaluatedAt: NOW.toISOString(),
      scoringVersion: "v1",
    },
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    ...overrides,
  };
}

function contact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: "contact-1",
    jobId: "job-1",
    name: "Alex Morgan",
    type: "recruiter",
    status: "IDENTIFIED",
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    ...overrides,
  };
}

describe("networking / outreach domain", () => {
  it("aceita job com 0 contatos", () => {
    const queue = selectNetworkingQueue([job({ id: "job-1", title: "Engineer" })], [], { now: NOW });
    expect(queue).toHaveLength(1);
    expect(queue[0]?.hasContact).toBe(false);
    expect(networkingIndicatorLabel(queue[0]!)).toBe("No contact");
  });

  it("aceita múltiplos contatos e escolhe o de maior confidence", () => {
    const contacts = [
      contact({ id: "c1", contactConfidence: "medium", name: "Recruiter" }),
      contact({ id: "c2", contactConfidence: "very_high", name: "Hiring Mgr", type: "hiring_manager" }),
    ];
    const queue = selectNetworkingQueue([job({ id: "job-1", title: "Engineer" })], contacts, { now: NOW });
    expect(queue[0]?.contactName).toBe("Hiring Mgr");
  });

  it("valida contactConfidence e relation (ContactType)", () => {
    expect(CONTACT_CONFIDENCE_LEVELS).toContain("very_high");
    expect(CONTACT_TYPES).toContain("team_member");
    expect(CONTACT_TYPES).toContain("talent_acquisition");
    expect(CONTACT_TYPES).toContain("vp_talent");
  });

  it("permite mensagem de outreach vazia em IDENTIFIED", () => {
    const empty = contact({ messageContent: undefined, status: "IDENTIFIED" });
    expect(canMarkOutreachReady(empty)).toBe(false);
    expect(markOutreachReady(empty).ok).toBe(false);
  });

  it("READY exige mensagem quando aplicável", () => {
    const prepared = markOutreachReady(contact({ messageContent: "Hi there" }));
    expect(prepared.ok).toBe(true);
    if (prepared.ok) expect(prepared.contact.status).toBe("MESSAGE_PREPARED");
  });

  it("mark sent grava sentAt e agenda follow-up default de 5 dias", () => {
    const result = markOutreachSent(
      contact({ messageContent: "Hello", status: "MESSAGE_PREPARED" }),
      {},
      NOW,
    );
    expect(result.contact.status).toBe("SENT");
    expect(result.contact.sentAt).toBe(NOW.toISOString());
    expect(result.contact.followUpAt).toBe(defaultFollowUpAt(NOW, 5));
  });

  it("reply muda status corretamente sem alterar Application", () => {
    const sent = markOutreachSent(contact({ messageContent: "Hello" }), {}, NOW).contact;
    const replied = recordOutreachReply(sent, {}, NOW);
    expect(replied.contact.status).toBe("REPLIED");
    expect(replied.contact.repliedAt).toBe(NOW.toISOString());
  });

  it("follow-up vira due após threshold e nunca auto-envia", () => {
    const sentAt = "2026-10-01T12:00:00.000Z";
    const followUpAt = defaultFollowUpAt(new Date(sentAt), 5);
    const due = contact({
      status: "SENT",
      sentAt,
      followUpAt,
      messageContent: "Hello",
    });
    expect(effectiveOutreachStatus(due, NOW)).toBe("FOLLOW_UP_DUE");
    expect(outreachNeverAutoSends()).toBe(true);
    const dismissed = dismissOutreachFollowUp(due, NOW);
    expect(dismissed.followUpAt).toBeUndefined();
  });

  it("networking queue ordena priority → score → confidence", () => {
    const jobs = [
      job({
        id: "job-b",
        title: "B",
        company: "B Co",
        jobMatch: {
          score: 99,
          decision: "apply",
          matchedSkills: [],
          missingSkills: [],
          evaluatedAt: NOW.toISOString(),
          scoringVersion: "v1",
        },
        jobContext: { skills: [], networking: { priority: 2 } },
      }),
      job({
        id: "job-a",
        title: "A",
        company: "A Co",
        jobMatch: {
          score: 80,
          decision: "apply",
          matchedSkills: [],
          missingSkills: [],
          evaluatedAt: NOW.toISOString(),
          scoringVersion: "v1",
        },
        jobContext: { skills: [], networking: { priority: 1 } },
      }),
      job({
        id: "job-c",
        title: "C",
        company: "C Co",
        jobMatch: {
          score: 95,
          decision: "apply",
          matchedSkills: [],
          missingSkills: [],
          evaluatedAt: NOW.toISOString(),
          scoringVersion: "v1",
        },
        jobContext: { skills: [], networking: { priority: 2 } },
      }),
    ];
    const contacts = [
      contact({ id: "cb", jobId: "job-b", contactConfidence: "low", name: "Low" }),
      contact({ id: "cc", jobId: "job-c", contactConfidence: "very_high", name: "High" }),
      contact({ id: "ca", jobId: "job-a", contactConfidence: "medium", name: "Med" }),
    ];
    const queue = selectNetworkingQueue(jobs, contacts, { now: NOW });
    // priority 1 first; then priority 2 by score (99 before 95); confidence only on ties
    expect(queue.map((item) => item.jobId)).toEqual(["job-a", "job-b", "job-c"]);
  });

  it("desempata por contact confidence quando priority e score empatam", () => {
    const jobs = [
      job({
        id: "job-low",
        title: "Low",
        jobMatch: {
          score: 90,
          decision: "apply",
          matchedSkills: [],
          missingSkills: [],
          evaluatedAt: NOW.toISOString(),
          scoringVersion: "v1",
        },
        jobContext: { skills: [], networking: { priority: 1 } },
      }),
      job({
        id: "job-high",
        title: "High",
        jobMatch: {
          score: 90,
          decision: "apply",
          matchedSkills: [],
          missingSkills: [],
          evaluatedAt: NOW.toISOString(),
          scoringVersion: "v1",
        },
        jobContext: { skills: [], networking: { priority: 1 } },
      }),
    ];
    const contacts = [
      contact({ id: "cl", jobId: "job-low", contactConfidence: "low", name: "Low" }),
      contact({ id: "ch", jobId: "job-high", contactConfidence: "very_high", name: "High" }),
    ];
    const queue = selectNetworkingQueue(jobs, contacts, { now: NOW });
    expect(queue.map((item) => item.jobId)).toEqual(["job-high", "job-low"]);
  });

  it("filtro no-contact funciona", () => {
    const jobs = [
      job({ id: "job-1", title: "With", jobContext: { skills: [], networking: { priority: 1 } } }),
      job({ id: "job-2", title: "Without", jobContext: { skills: [], networking: { priority: 2 } } }),
    ];
    const queue = selectNetworkingQueue(jobs, [contact({ jobId: "job-1" })], {
      filter: "no_contact",
      now: NOW,
    });
    expect(queue.map((item) => item.jobId)).toEqual(["job-2"]);
  });

  it("import pipeline preserva score manual e não cria application status", () => {
    const result = importOpportunityPipeline(
      {
        version: 1,
        kind: "applyflow-opportunity-pipeline",
        opportunities: [
          {
            company: "Acme Fiction",
            role: "Senior Engineer",
            matchScore: 96,
            decision: "APPLY",
            availabilityStatus: "confirmed_open",
            priority: 1,
            networkingStrategy: "apply_and_message",
            recommendedCase: "ApplyFlow",
            contact: {
              name: "Jordan Fiction",
              linkedinUrl: "https://www.linkedin.com/in/jordan-fiction",
              relation: "hiring_manager",
              confidence: "very_high",
              evidence: "Publicly stated ownership of this fictional role.",
              outreachLanguage: "en",
              outreachMessage: "Hi Jordan — fictional outreach seed.",
            },
          },
          {
            company: "No Contact Co",
            role: "Frontend",
            match: 88,
            decision: "apply",
            priority: 2,
            networkingStrategy: "apply_only",
            contact: null,
          },
        ],
      },
      { now: NOW },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.jobs).toHaveLength(2);
    expect(result.jobs[0]?.jobMatch.score).toBe(96);
    expect(result.jobs[0]?.jobContext.networking?.manualMatchOverride).toBe(true);
    expect(result.jobs[0]?.status).toBe("reviewing");
    expect(result.contacts).toHaveLength(1);
    expect(result.contacts[0]?.status).toBe("MESSAGE_PREPARED");
    expect(result.contacts[0]?.contactConfidence).toBe("very_high");

    const queueItem = selectNetworkingQueue(result.jobs, result.contacts, { now: NOW })[0];
    expect(queueItem?.manualMatchOverride).toBe(true);
    expect(queueItem?.matchScore).toBe(96);

    const refreshed = reevaluateApplyFlowJobMatch(result.jobs[0]!, gustavoProfile, undefined, NOW);
    expect(refreshed.jobMatch.score).toBe(96);
    expect(refreshed.jobContext.networking?.manualMatchOverride).toBe(true);
  });

  it("legacy contact sem novos campos continua válido", () => {
    const legacy = contact({
      applicationId: "app-1",
      status: "not_contacted",
    });
    expect(effectiveOutreachStatus(legacy, NOW)).toBe("IDENTIFIED");
  });
});
