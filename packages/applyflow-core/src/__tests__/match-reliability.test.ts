import { describe, expect, it } from "vitest";

import { parseEmployerCompensation } from "../compensation.js";
import { buildCandidateEvidence } from "../evidence-from-profile.js";
import { evaluateJobDecisionV2 } from "../evaluate-job-decision-v2.js";
import { extractJobRequirements } from "../extract-job-requirements.js";
import {
  assessJobDescriptionQuality,
  hidesRequirements,
  normalizeJobDescriptionEncoding,
} from "../job-description-quality.js";
import { JOB_DESCRIPTION_SNAPSHOT_MAX_CHARS, snapshotJobDescription } from "../job-description-snapshot.js";
import { assessJobEligibility, type JobEligibilityOptions } from "../job-eligibility.js";
import { postingSeniority } from "../job-seniority.js";
import { validateCandidateProfile } from "../profile-schema.js";
import * as fx from "./fixtures/match-reliability.fixtures.js";

const NOW = new Date("2026-11-23T12:00:00.000Z");
const PROFILE = validateCandidateProfile({
  name: "Synthetic Candidate",
  location: "Campinas, SP, Brazil",
  englishLevel: "Advanced",
  comfortableInEnglish: true,
  roles: ["Senior Full Stack Engineer", "Founder"],
  skills: { React: 6, Nextjs: 3, TypeScript: 5, Nodejs: 6, PostgreSQL: 3 },
  facts: {
    location: "Campinas, SP, Brazil",
    totalYearsExperience: 6,
    remotePreference: "remote",
    englishLevel: "Advanced",
  },
});
const EVIDENCE = buildCandidateEvidence(PROFILE, [], NOW);

function decide(jobText: string, extra: { jobTitle?: string; jobLocation?: string } = {}) {
  return evaluateJobDecisionV2({ jobText, evidence: EVIDENCE, profile: PROFILE, jobId: "job_fx", ...extra });
}

function location(text: string, options?: JobEligibilityOptions) {
  return assessJobEligibility(PROFILE, text, options).findings.find((item) => item.dimension === "location");
}

function seniority(decision: ReturnType<typeof decide>) {
  return decision.matches.find((item) => item.requirement.id === "req-seniority");
}

describe("1. partial description (header-only excerpt)", () => {
  it("is classified as partial and never yields a positive recommendation", () => {
    const decision = decide(fx.FDE_PARTIAL_EXCERPT, { jobTitle: "Forward Deployed Engineer (Client-Facing)" });
    expect(decision.descriptionQuality?.status).toBe("partial");
    expect(decision.descriptionQuality?.signals).toEqual(
      expect.arrayContaining(["source_excerpt_marker", "page_chrome", "insufficient_requirements"]),
    );
    expect(decision.decision).toBe("needs_info");
    expect(decision.confidence).toBe("low");
    expect(decision.reasons.join(" ")).toMatch(/Descrição parcial/);
    expect(decision.reasons.join(" ")).toMatch(/localização e modelo remoto não substituem requisitos técnicos/);
  });

  it("does not score location or remote work as technical fit", () => {
    const locationOnly = decide("Senior Software Engineer\nRemote - Brazil. Fully remote team.");
    expect(locationOnly.decision).toBe("needs_info");
    expect(locationOnly.descriptionQuality?.signals).toContain("insufficient_requirements");
  });
});

describe("2. full description", () => {
  it("evaluates the requirements that the excerpt hid", () => {
    const decision = decide(fx.FDE_FULL, { jobTitle: "Forward Deployed Engineer (Client-Facing)" });
    expect(decision.descriptionQuality?.status).toBe("complete");
    const labels = decision.matches.map((item) => item.requirement.label);
    expect(labels).toEqual(expect.arrayContaining(["Professional experience (4+ years)", "API integrations"]));
    expect(decision.matches.find((item) => item.requirement.label === "API integrations")?.status).toBe("unknown");
    expect(decision.decision).toBe("needs_info");
    expect(decision.reasons.join(" ")).toMatch(/API integrations/);
  });

  it("caps confidence when the stored text reached the snapshot limit", () => {
    const long = `${fx.SENIORITY_BODY}\n${"Context paragraph about the team and product. ".repeat(400)}`;
    const snapshot = snapshotJobDescription(long) ?? "";
    expect(snapshot.length).toBe(JOB_DESCRIPTION_SNAPSHOT_MAX_CHARS);
    const decision = decide(snapshot, { jobTitle: fx.SENIOR_TITLE });
    expect(decision.descriptionQuality?.signals).toContain("truncated_at_limit");
    expect(decision.confidence).not.toBe("high");
  });
});

describe("3. money that is not compensation", () => {
  it("ignores household debt figures", () => {
    expect(extractJobRequirements(fx.NON_SALARY_MONEY).find((item) => item.requirementType === "salary")).toBeUndefined();
    const employer = parseEmployerCompensation(fx.NON_SALARY_MONEY);
    expect(employer.min).toBeUndefined();
    expect(employer.max).toBeUndefined();
  });

  it("keeps an explicit salary range with currency and period", () => {
    const employer = parseEmployerCompensation(fx.EXPLICIT_SALARY);
    expect(employer).toMatchObject({ currency: "USD", min: 78_000, max: 90_000, period: "annual" });
  });
});

describe("4. manager mentioned in partner context", () => {
  it("uses the posting title instead of a manager quoted in the body", () => {
    expect(postingSeniority({ title: fx.PARTNER_MANAGER_MENTION_TITLE, text: fx.PARTNER_MANAGER_MENTION }).level).toBe("senior");
    const eligibility = assessJobEligibility(PROFILE, fx.PARTNER_MANAGER_MENTION, {
      title: fx.PARTNER_MANAGER_MENTION_TITLE,
    });
    expect(eligibility.findings.some((item) => /Engineering Manager/.test(item.reason))).toBe(false);
    const decision = decide(fx.PARTNER_MANAGER_MENTION, { jobTitle: fx.PARTNER_MANAGER_MENTION_TITLE });
    expect(seniority(decision)?.requirement.label).toBe("Seniority: senior");
    expect(seniority(decision)?.status).toBe("proven");
  });
});

describe("5. remote Brazil-eligible shapes", () => {
  it.each(fx.REMOTE_BRAZIL_SHAPES)("%s → eligible", (text) => {
    expect(location(text)?.status).toBe("eligible");
  });

  it.each(fx.REGION_ELIGIBLE_SHAPES)("%s → eligible via region", (text) => {
    expect(location(text)?.status).toBe("eligible");
  });

  it("uses structured location metadata when the text names no country", () => {
    const finding = location(fx.METADATA_ONLY_BRAZIL.text, { location: fx.METADATA_ONLY_BRAZIL.location });
    expect(finding?.status).toBe("eligible");
    expect(finding?.reason).toMatch(/localização estruturada/);
    expect(location(fx.METADATA_ONLY_BRAZIL.text)?.status).toBe("unknown");
  });
});

describe("6. region with Brazil excluded", () => {
  it.each(fx.LATAM_EXCLUDING_BRAZIL)("%s → ineligible", (text) => {
    expect(location(text)?.status).toBe("ineligible");
  });

  it("worldwide is not Brazil-eligible when Brazil is excluded", () => {
    expect(location(fx.WORLDWIDE_WITH_EXCLUSION)?.status).toBe("ineligible");
    expect(location("Senior Software Engineer\nRemote worldwide, except India.\nReact.")?.status).toBe("eligible");
  });
});

describe("7. contradictory location", () => {
  it("keeps the ambiguity when metadata says remote and the text requires an office", () => {
    const finding = location(fx.CONTRADICTORY_HYBRID.text, { location: fx.CONTRADICTORY_HYBRID.location });
    expect(finding?.status).toBe("unknown");
    expect(finding?.requiresConfirmation).toBe(true);
    const decision = decide(fx.CONTRADICTORY_HYBRID.text, {
      jobTitle: fx.SENIOR_TITLE,
      jobLocation: fx.CONTRADICTORY_HYBRID.location,
    });
    expect(decision.decision).not.toMatch(/^apply_/);
  });
});

describe("8. senior proven", () => {
  it("proves a Senior posting from a documented Senior role", () => {
    const fromTitle = decide(fx.SENIORITY_BODY, { jobTitle: fx.SENIOR_TITLE });
    expect(seniority(fromTitle)?.requirement.label).toBe("Seniority: senior");
    expect(seniority(fromTitle)?.status).toBe("proven");
    const fromText = decide(`${fx.SENIOR_TITLE}\n${fx.SENIORITY_BODY}`);
    expect(seniority(fromText)?.status).toBe("proven");
  });
});

describe("9. staff not demonstrated", () => {
  it("does not treat Senior or Founder as Staff evidence", () => {
    const decision = decide(`${fx.STAFF_TITLE}\n${fx.SENIORITY_BODY}`, { jobTitle: fx.STAFF_TITLE });
    expect(seniority(decision)?.requirement.label).toBe("Seniority: staff");
    expect(seniority(decision)?.status).toBe("partial");
    expect(decision.decision).not.toBe("apply_high");
    expect(decision.decision).not.toBe("apply_normal");
  });

  it("does not treat Founder as formal management", () => {
    const decision = decide(fx.SENIORITY_BODY, { jobTitle: "Engineering Manager" });
    expect(seniority(decision)?.status).toBe("partial");
    expect(seniority(decision)?.reason).toMatch(/founder roles do not establish it/);
  });
});

describe("10. bad encoding", () => {
  it("repairs UTF-8 read as Latin-1 / CP1252", () => {
    expect(normalizeJobDescriptionEncoding(fx.MOJIBAKE)).toBe("We’re hiring in São Paulo — café “included”.");
    expect(normalizeJobDescriptionEncoding(fx.MOJIBAKE_CP1252)).toBe("We’re hiring in São Paulo.");
    expect(snapshotJobDescription(fx.MOJIBAKE)).toBe("We’re hiring in São Paulo — café “included”.");
  });

  it("leaves correctly encoded text untouched", () => {
    expect(normalizeJobDescriptionEncoding(fx.CLEAN_ACCENTED)).toBe(fx.CLEAN_ACCENTED);
  });
});

describe("11. unknown vs unmet", () => {
  it("keeps missing evidence as unknown and asks instead of skipping", () => {
    const decision = decide(fx.UNPROVEN_STACK, { jobTitle: "Senior Backend Engineer" });
    const stack = decision.matches.filter((item) => /Elixir|Kubernetes/.test(item.requirement.label));
    expect(stack.length).toBe(2);
    for (const item of stack) expect(item.status).toBe("unknown");
    expect(decision.decision).toBe("needs_info");
    expect(decision.candidateInputRequests.length).toBeGreaterThan(0);
  });

  it("quality contract separates a short posting from a partial capture", () => {
    const quality = assessJobDescriptionQuality(fx.UNPROVEN_STACK, { technicalRequirementCount: 2 });
    expect(quality.status).toBe("complete");
    expect(hidesRequirements(quality)).toBe(false);
    expect(assessJobDescriptionQuality("", {}).status).toBe("unavailable");
  });
});

describe("12. determinism", () => {
  it("returns identical results for identical inputs", () => {
    const inputs = [
      [fx.FDE_FULL, { jobTitle: "Forward Deployed Engineer" }],
      [fx.CONTRADICTORY_HYBRID.text, { jobLocation: fx.CONTRADICTORY_HYBRID.location }],
      [fx.NON_SALARY_MONEY, { jobTitle: fx.SENIOR_TITLE }],
    ] as const;
    for (const [text, extra] of inputs) {
      expect(decide(text, extra)).toEqual(decide(text, extra));
    }
  });
});
