import { describe, expect, it, vi } from "vitest";

import { canCreateApplicationPackV2, createApplicationPackV2 } from "../application-pack-v2.js";
import { deriveApplicationReadiness } from "../application-readiness.js";
import { buildCandidateEvidence } from "../evidence-from-profile.js";
import { evaluateJobDecisionV2 } from "../evaluate-job-decision-v2.js";
import { evaluateJobMatch } from "../evaluate-job-match.js";
import { extractJobIntelligence } from "../job-intelligence.js";
import {
  assessJobEligibility,
  canonicalizeCandidateLocation,
  eligibilitySortRank,
} from "../job-eligibility.js";
import { sortOpportunityJobs } from "../opportunity-queue.js";
import { validateCandidateProfile } from "../profile-schema.js";
import { createResumeLibraryFromProfile } from "../resume-library.js";
import type { ApplyFlowJob } from "../job-match-types.js";

const NOW = new Date("2026-10-26T12:00:00.000Z");
const STACK = "React, Next.js, TypeScript, Node.js and PostgreSQL.";

function candidate(location: string) {
  return validateCandidateProfile({
    name: "Candidato",
    location,
    englishLevel: "Advanced",
    roles: ["Senior Full Stack Engineer", "Founder"],
    skills: { React: 6, Nextjs: 3, TypeScript: 5, Nodejs: 6, PostgreSQL: 3 },
    facts: {
      location,
      totalYearsExperience: 6,
      remotePreference: "remote",
      englishLevel: "Advanced",
    },
  });
}

const PT = candidate("Santos/SP");
const EN = candidate("Santos, SP, Brazil");

function decide(profile: ReturnType<typeof candidate>, jobText: string) {
  return evaluateJobDecisionV2({
    jobText,
    evidence: buildCandidateEvidence(profile, [], NOW),
    profile,
    jobId: "job_eligibility",
  });
}

function technicalScore(jobText: string) {
  return evaluateJobMatch(PT, { skills: extractJobIntelligence(jobText).detectedSkills }, { now: NOW }).score;
}

const REMOTE_BRAZIL = `Senior Full Stack Engineer. Remote - Brazil. ${STACK} Minimum 5 years.`;
const US_ONLY = `Senior Full Stack Engineer. Remote - United States only. Applicants must reside in the United States. ${STACK} Minimum 5 years.`;
const ONSITE_SP = `Senior Full Stack Engineer. Onsite in São Paulo. ${STACK} Minimum 5 years.`;
const STAFF_TEN = `Staff Engineer. Remote - Brazil. ${STACK} 10+ years required.`;
const STAFF_OPEN = `Staff Engineer. Remote - Brazil. ${STACK}`;
const WORLDWIDE = `Senior Full Stack Engineer. Company headquartered in the United States. Remote worldwide. ${STACK} Minimum 5 years.`;
const BERLIN = `Senior Full Stack Engineer. Relocation required to Berlin. ${STACK}`;
const NO_LOCATION = `Senior Full Stack Engineer. ${STACK} Minimum 5 years.`;
const MANAGER = `Engineering Manager. Remote - Brazil. 3+ years of direct reports. ${STACK}`;

describe("canonicalizeCandidateLocation", () => {
  it("trata Santos/SP e Santos, SP, Brazil como o mesmo lugar", () => {
    expect(canonicalizeCandidateLocation("Santos/SP")).toEqual({
      city: "santos",
      state: "SP",
      country: "Brazil",
    });
    expect(canonicalizeCandidateLocation("Santos, SP, Brazil")).toEqual(
      canonicalizeCandidateLocation("Santos/SP"),
    );
    expect(canonicalizeCandidateLocation("Santos, SP, Brasil")).toEqual(
      canonicalizeCandidateLocation("Santos/SP"),
    );
  });

  it("não resolve texto que não é um local", () => {
    expect(canonicalizeCandidateLocation("")).toBeUndefined();
    expect(canonicalizeCandidateLocation("a team distributed across several offices and product lines worldwide")).toBeUndefined();
  });
});

describe("job eligibility scenarios", () => {
  it("A — remote Brasil sênior fica elegível e na frente de uma vaga equivalente inelegível", () => {
    const eligible = assessJobEligibility(PT, REMOTE_BRAZIL);
    const blocked = assessJobEligibility(PT, US_ONLY);
    expect(eligible.status).toBe("eligible");
    expect(eligible.findings.find((item) => item.dimension === "location")?.status).toBe("eligible");
    expect(eligible.findings.find((item) => item.dimension === "work_mode")?.status).toBe("eligible");
    expect(eligible.findings.find((item) => item.dimension === "seniority")?.status).toBe("eligible");
    expect(eligibilitySortRank(eligible.status)).toBeLessThan(eligibilitySortRank(blocked.status));
    expect(technicalScore(REMOTE_BRAZIL)).toBe(technicalScore(US_ONLY));
  });

  it("B — Estados Unidos only é incompatível para PT e EN, sem candidatura acionável", () => {
    for (const profile of [PT, EN]) {
      const eligibility = assessJobEligibility(profile, US_ONLY);
      expect(eligibility.status).toBe("ineligible");
      expect(eligibility.findings.find((item) => item.dimension === "location")?.reason).toMatch(/Estados Unidos|United States/);
      const decision = decide(profile, US_ONLY);
      expect(decision.eligibility?.status).toBe("ineligible");
      expect(decision.decision).toBe("skip");
      const pack = createApplicationPackV2({
        jobId: "job_us",
        jobText: US_ONLY,
        profile,
        evidence: buildCandidateEvidence(profile, [], NOW),
        decision,
        now: NOW,
      });
      expect(pack.status).toBe("blocked");
      expect(pack.decision).not.toBe("apply_high");
      expect(pack.decision).not.toBe("apply_normal");
      expect(pack.decision).not.toBe("apply_stretch");
    }
  });

  it("C — presencial em São Paulo conflita com a preferência remoto e não empata com remote Brasil", () => {
    const onsite = assessJobEligibility(PT, ONSITE_SP);
    const remote = assessJobEligibility(PT, REMOTE_BRAZIL);
    expect(onsite.findings.find((item) => item.dimension === "work_mode")?.status).toBe("unknown");
    expect(onsite.findings.find((item) => item.dimension === "work_mode")?.reason).toMatch(/preferência/i);
    expect(onsite.status).not.toBe("eligible");
    expect(onsite.status).not.toBe("ineligible");
    expect(eligibilitySortRank(remote.status)).toBeLessThan(eligibilitySortRank(onsite.status));
    expect(technicalScore(ONSITE_SP)).toBe(technicalScore(REMOTE_BRAZIL));
  });

  it("D — 10+ anos falha com 6 anos registrados", () => {
    const result = assessJobEligibility(PT, STAFF_TEN);
    expect(result.status).toBe("ineligible");
    expect(result.findings.find((item) => item.dimension === "seniority")?.reason).toMatch(/10/);
    expect(result.findings.find((item) => item.dimension === "seniority")?.reason).toMatch(/6/);
    expect(decide(PT, STAFF_TEN).decision).toBe("skip");
  });

  it("E — Staff sem anos explícitos não vira Senior nem recebe mínimo inventado", () => {
    const result = assessJobEligibility(PT, STAFF_OPEN);
    expect(result.status).toBe("unknown");
    expect(result.status).not.toBe("ineligible");
    const seniority = result.findings.find((item) => item.dimension === "seniority");
    expect(seniority?.status).toBe("unknown");
    expect(seniority?.reason).toMatch(/Staff/);
    expect(seniority?.reason).not.toMatch(/mínimo \d+/);
  });

  it("F — sede nos Estados Unidos com remoto mundial não exclui o Brasil", () => {
    const result = assessJobEligibility(PT, WORLDWIDE);
    expect(result.findings.find((item) => item.dimension === "location")?.status).toBe("eligible");
    expect(result.status).toBe("eligible");
  });

  it("G — relocação para Berlim sem resposta permanece desconhecida", () => {
    const result = assessJobEligibility(PT, BERLIN);
    const location = result.findings.find((item) => item.dimension === "location");
    expect(result.status).toBe("unknown");
    expect(location?.requiresConfirmation).toBe(true);
    expect(location?.reason).toMatch(/relocação/i);
    expect(location?.reason).not.toMatch(/disposto|aceita relocação/i);
  });

  it("H — ausência de restrição geográfica não vira permissão", () => {
    const result = assessJobEligibility(PT, NO_LOCATION);
    expect(result.findings.find((item) => item.dimension === "location")?.status).toBe("unknown");
    expect(result.status).not.toBe("eligible");
    expect(result.status).not.toBe("ineligible");
    expect(technicalScore(NO_LOCATION)).toBe(technicalScore(REMOTE_BRAZIL));
  });

  it("I — gestão de pessoas não é inferida de Founder", () => {
    const result = assessJobEligibility(PT, MANAGER);
    const seniority = result.findings.find((item) => item.reason.toLowerCase().includes("gestão") || item.reason.toLowerCase().includes("founder"));
    expect(seniority?.status).toBe("unknown");
    expect(seniority?.reason).toMatch(/founder/i);
    expect(result.status).not.toBe("eligible");
    expect(result.findings.some((item) => /3 anos de gestão comprovados/i.test(item.reason))).toBe(false);
  });

  it("J — PT e EN produzem a mesma decisão geográfica", () => {
    const jobs = [REMOTE_BRAZIL, US_ONLY, WORLDWIDE, "Remote - LATAM. React.", "Remote - Europe only. React.", "Remote - Philippines only. React.", "Remote. React."];
    for (const jobText of jobs) {
      const pt = assessJobEligibility(PT, jobText);
      const en = assessJobEligibility(EN, jobText);
      expect(pt.status).toBe(en.status);
      expect(pt.findings.map((item) => [item.dimension, item.status])).toEqual(
        en.findings.map((item) => [item.dimension, item.status]),
      );
    }
    expect(assessJobEligibility(PT, "Remote - LATAM. React.").status).toBe("eligible");
    expect(assessJobEligibility(PT, "Remote - Europe only. React.").status).toBe("ineligible");
    expect(assessJobEligibility(PT, "Remote - Philippines only. React.").status).toBe("ineligible");
    expect(assessJobEligibility(PT, "Remote. React.").findings.find((item) => item.dimension === "location")?.status).toBe(
      "unknown",
    );
  });
});

describe("remote role based/located in LATAM geographic phrases", () => {
  const EUROPE_CANDIDATE = candidate("Berlin, Germany");

  it.each([
    "Remote role based in Latin America. React TypeScript.",
    "Remote position based in LATAM. React TypeScript.",
    "Remote role located in Latin America. React TypeScript.",
    "Remote opportunity based in Latin America. React TypeScript.",
    "Remote role based within Latin America. React TypeScript.",
    "Remote in LATAM. React TypeScript.",
    "LATAM only. Remote. React TypeScript.",
  ])("positive — %s → Brazil eligible", (jobText) => {
    const result = assessJobEligibility(EN, jobText);
    expect(result.findings.find((item) => item.dimension === "location")?.status).toBe("eligible");
    expect(result.status).toBe("eligible");
  });

  it("negative — LATAM only in the job title stays unknown", () => {
    const result = assessJobEligibility(EN, "Senior Software Engineer LATAM. Fully remote. React TypeScript.");
    expect(result.findings.find((item) => item.dimension === "location")?.status).toBe("unknown");
  });

  it("negative — fully remote without a geographic restriction stays unknown", () => {
    const result = assessJobEligibility(EN, "Senior Software Engineer. Fully remote, no geographic restriction stated. React TypeScript.");
    expect(result.findings.find((item) => item.dimension === "location")?.status).toBe("unknown");
  });

  it("negative — LATAM clients / company operates phrases are not location constraints", () => {
    expect(
      assessJobEligibility(EN, "Experience working with LATAM clients, remote position. React TypeScript.").findings.find(
        (item) => item.dimension === "location",
      )?.status,
    ).toBe("unknown");
    expect(
      assessJobEligibility(EN, "Company operates in Latin America, role is remote. React TypeScript.").findings.find(
        (item) => item.dimension === "location",
      )?.status,
    ).toBe("unknown");
  });

  it("negative — Remote role based in Europe is incompatible for Brazil", () => {
    const result = assessJobEligibility(EN, "Remote role based in Europe. React TypeScript.");
    expect(result.findings.find((item) => item.dimension === "location")?.status).toBe("ineligible");
    expect(result.status).toBe("ineligible");
  });

  it("negative — Remote role based in Latin America is incompatible for a Europe candidate", () => {
    const result = assessJobEligibility(EUROPE_CANDIDATE, "Remote role based in Latin America. React TypeScript.");
    expect(result.findings.find((item) => item.dimension === "location")?.status).toBe("ineligible");
    expect(result.status).toBe("ineligible");
  });

  it("precedence — Europe-only beats a later LATAM collaboration mention", () => {
    const result = assessJobEligibility(
      EN,
      "Remote Europe only. LATAM team collaboration required. React TypeScript.",
    );
    expect(result.findings.find((item) => item.dimension === "location")?.status).toBe("ineligible");
    expect(result.status).toBe("ineligible");
  });

  it("precedence — must reside in Mexico beats Remote role based in Latin America", () => {
    const result = assessJobEligibility(
      EN,
      "Remote role based in Latin America, but applicants must reside in Mexico. React TypeScript.",
    );
    expect(result.findings.find((item) => item.dimension === "location")?.status).toBe("ineligible");
    expect(result.status).toBe("ineligible");
  });

  it("Wagmo-shaped posting — Remote role based in Latin America unlocks Brazil eligibility and pack path", () => {
    const wagmoShaped = `Senior Software Engineer
Remote role based in Latin America. Must work at least 6 hours of overlap with US Eastern Time.
Requirements: React, TypeScript, Python. ${STACK}`;
    expect(assessJobEligibility(EN, wagmoShaped).findings.find((item) => item.dimension === "location")?.status).toBe(
      "eligible",
    );

    // Mirror ATS EN skill coverage used in the QA Wagmo audit (Python included).
    const atsEnLike = validateCandidateProfile({
      ...EN,
      skills: { ...EN.skills, Python: 3 },
      facts: { ...EN.facts, totalYearsExperience: 6 },
    });
    const decision = decide(atsEnLike, wagmoShaped);
    expect(decision.eligibility?.status).toBe("eligible");
    expect(decision.decision).toBe("apply_normal");
    expect(canCreateApplicationPackV2(decision.decision)).toBe(true);
    const seniorityMatch = decision.matches.find((item) => item.requirement.id === "req-seniority");
    expect(seniorityMatch?.status).toBe("unknown");
  });
});

describe("eligibility negative cases", () => {
  it("não trata remote, inglês, sede ou founder como prova do que não está registrado", () => {
    expect(assessJobEligibility(PT, `Remote. ${STACK}`).findings.find((item) => item.dimension === "location")?.status).toBe(
      "unknown",
    );
    const fluent = validateCandidateProfile({
      ...PT,
      englishLevel: "Fluent",
      facts: { ...PT.facts, englishLevel: "Fluent" },
    });
    expect(assessJobEligibility(fluent, US_ONLY).status).toBe("ineligible");
    expect(assessJobEligibility(PT, BERLIN).status).not.toBe("ineligible");
    expect(assessJobEligibility(PT, WORLDWIDE).status).not.toBe("ineligible");
    expect(assessJobEligibility(PT, STAFF_OPEN).status).not.toBe("ineligible");
    expect(assessJobEligibility(PT, NO_LOCATION).status).not.toBe("eligible");
  });

  it("não altera o perfil nem consulta rede", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"));
    const before = JSON.stringify(PT);
    assessJobEligibility(PT, US_ONLY);
    expect(JSON.stringify(PT)).toBe(before);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

describe("eligibility ordering", () => {
  it("ordena elegível, confirmação e incompatível antes do score", () => {
    const match = {
      score: 100,
      decision: "apply" as const,
      matchedSkills: ["React"],
      missingSkills: [],
      evaluatedAt: NOW.toISOString(),
      scoringVersion: "v1" as const,
    };
    const job = (id: string, description: string, score: number): ApplyFlowJob => ({
      id,
      title: id,
      source: "paste",
      status: "reviewing",
      descriptionSnapshot: description,
      jobContext: { skills: ["React"] },
      jobMatch: { ...match, score },
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
    });
    const sorted = sortOpportunityJobs(
      [
        job("blocked", US_ONLY, 100),
        job("open", NO_LOCATION, 100),
        job("fit", REMOTE_BRAZIL, 70),
      ],
      "match",
      PT,
    ).map((item) => item.id);
    expect(sorted).toEqual(["fit", "open", "blocked"]);
  });
});

describe("readiness respects hard ineligibility", () => {
  it("não trata score técnico alto como lacuna resolvida quando o local é incompatível", () => {
    const job: ApplyFlowJob = {
      id: "job_us_ready",
      title: "Senior Full Stack Engineer",
      source: "paste",
      status: "reviewing",
      descriptionSnapshot: US_ONLY,
      jobContext: { skills: ["React"] },
      jobMatch: {
        score: 100,
        decision: "apply",
        matchedSkills: ["React"],
        missingSkills: [],
        evaluatedAt: NOW.toISOString(),
        scoringVersion: "v1",
      },
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
    };
    const readiness = deriveApplicationReadiness({
      job,
      resumeLibrary: createResumeLibraryFromProfile(PT, { now: NOW }),
    });
    expect(readiness.items.find((item) => item.id === "analyzed")?.detail).toContain("100/100");
    expect(readiness.items.find((item) => item.id === "gaps")).toMatchObject({
      state: "attention",
      reason: "ineligible",
    });
  });
});
