import { describe, expect, it } from "vitest";

import { buildCandidateEvidence } from "../evidence-from-profile.js";
import { evaluateJobDecisionV2 } from "../evaluate-job-decision-v2.js";
import { matchRequirementsToEvidence } from "../evidence-matching.js";
import { extractJobRequirements } from "../extract-job-requirements.js";
import { ingestApplyFlowJob, reevaluateApplyFlowJobMatch } from "../ingest-applyflow-job.js";
import { extractJobIntelligence } from "../job-intelligence.js";
import { EMPTY_ANSWER_BANK, resolveSkillCanonicalKey, validateCandidateProfile } from "../profile-schema.js";

const NOW = new Date("2026-09-11T01:28:07.206Z");

/** Descrição original salva no DOG-001, incluindo o typo Sadupabase. Não editar para facilitar extração. */
export const TEMPO_ORIGINAL_DESCRIPTION = `Full-Stack Engineer (Remote)
Location
Brazil (Remote); Argentina (Remote); India (Remote); Philippines - Remote
Employment Type
Full time
Location Type
Remote
Department
Engineering
Engineering (Agent+)

Job Overview
As a full-stack engineer at Tempo, you will play a pivotal role. Your focus will be on developing intuitive, high-performance web applications within our AI-powered visual IDE. You'll collaborate with a cross-functional team, contributing your technical expertise to create seamless experiences for designers and developers.

Key Responsibilities
- Design and implement robust front-end solutions for our visual IDE, optimizing for performance and scalability.
- Work closely with UX/UI designers to translate design concepts into functional code.
- Contribute to the development lifecycle, including coding, testing, debugging, and deployment.
- Build and maintain backend capabilities in TypeScript, including Supabase (database, auth, storage) and Supabase Edge Functions for serverless logic and integrations.
- Create, version, and document APIs (REST and/or RPC) with clear specifications using OpenAPI/Swagger, ensuring strong developer experience and maintainability.
- Contribute to the full development lifecycle, including coding, testing, debugging, and deployment across both frontend and backend.
- Ensure high-quality graphic standards and brand consistency.
- Stay updated with emerging front-end technologies and methodologies, integrating them to enhance our platform's capabilities.
- Maintain an online presence between the hours of 9am - 4pm EST

Qualifications
- Bachelor’s degree in Computer Science, Engineering, or related field — or equivalent practical experience.
- 2+ years experience as a full-stack developer (startup/product experience preferred).
- Strong proficiency in TypeScript and modern React development (HTML/CSS/JS fundamentals).
- Experience with Tailwind CSS and building responsive, adaptive interfaces.
- Working experience with Sadupabase (Postgres/Auth/Storage) and Supabase Edge Functions.
- Experience building and documenting APIs, including using OpenAPI/Swagger (or similar).
- Strong problem-solving skills, attention to detail, and comfort shipping production code.
- Clear communicator and collaborative teammate who works well with designers, PMs, and engineers.
- Fluent in English (written and spoken).

What We Offer
- The opportunity to be part of an innovative, fast-growing startup.
- A collaborative, flexible, and supportive work environment where your contributions directly impact the product's success.
- Starting salary of $40,000 USD with the opportunity to increase to $60,000 USD

Apply for this Job`;

function fictionalProfile(overrides: Record<string, unknown> = {}) {
  return validateCandidateProfile({
    name: "Carla Mota",
    location: "Santos/SP, Brasil",
    englishLevel: "Advanced",
    roles: ["Full Stack Engineer"],
    skills: {
      React: null,
      TypeScript: null,
      Tailwind: null,
      Nodejs: null,
      PostgreSQL: null,
    },
    salary: {},
    answerBank: EMPTY_ANSWER_BANK,
    facts: {},
    ...overrides,
  });
}

function decide(jobText: string, overrides: Record<string, unknown> = {}) {
  const profile = fictionalProfile(overrides);
  return evaluateJobDecisionV2({
    jobText,
    evidence: buildCandidateEvidence(profile, [], NOW),
    profile,
    jobId: "job_tempo_fixture",
  });
}

function matchBy(result: ReturnType<typeof decide>, pattern: RegExp) {
  return result.matches.filter((item) => pattern.test(item.requirement.label) || pattern.test(item.requirement.skillHint ?? ""));
}

describe("DOG-001 Tempo — extração da descrição original", () => {
  it("preserva o typo Sadupabase e ainda extrai Supabase pela grafia correta", () => {
    expect(TEMPO_ORIGINAL_DESCRIPTION).toContain("Sadupabase");
    expect(TEMPO_ORIGINAL_DESCRIPTION).toContain("Supabase");
    const intel = extractJobIntelligence(TEMPO_ORIGINAL_DESCRIPTION);
    expect(intel.detectedSkills).toEqual(expect.arrayContaining(["Supabase", "Supabase Edge Functions", "REST", "OpenAPI", "React", "TypeScript", "Tailwind"]));
    expect(intel.detectedSkills).not.toContain("Sadupabase");
    expect(intel.detectedSkills.some((item) => /sadupabase/i.test(item))).toBe(false);
  });

  it("não cria alias global a partir do typo Sadupabase", () => {
    const typoOnly = "Working experience with Sadupabase (Postgres/Auth/Storage) is required.";
    const intel = extractJobIntelligence(typoOnly);
    expect(intel.detectedSkills).not.toContain("Supabase");
    expect(extractJobRequirements(typoOnly).some((item) => /supabase/i.test(item.label))).toBe(false);
  });

  it("extrai horário EST, inglês fluente, 2+ years full-stack e remuneração sem inventar periodicidade", () => {
    const reqs = extractJobRequirements(TEMPO_ORIGINAL_DESCRIPTION);
    const hours = reqs.find((item) => item.requirementType === "schedule");
    expect(hours?.extractedText).toMatch(/9am\s*-\s*4pm EST/i);
    expect(hours?.qualifiers).toEqual(expect.arrayContaining(["est", "dst_ambiguous"]));

    const english = reqs.find((item) => item.requirementType === "language");
    expect(english?.label).toMatch(/fluent/i);
    expect(english?.qualifiers).toEqual(expect.arrayContaining(["fluent", "spoken"]));
    expect(english?.extractedText).toMatch(/fluent in english/i);

    const years = reqs.find((item) => item.requirementType === "years" && /full-stack/i.test(item.label));
    expect(years?.minYears).toBe(2);

    const salary = reqs.find((item) => item.requirementType === "salary");
    expect(salary?.extractedText).toMatch(/\$40,000 USD[\s\S]*\$60,000 USD/i);
    expect(salary?.qualifiers).toEqual(expect.arrayContaining(["periodicity_unknown"]));
    expect(salary?.label.toLowerCase()).not.toMatch(/annual|year|month|monthly/);
  });

  it("reconhece remote em inglês e países listados, inclusive variação PT", () => {
    expect(extractJobIntelligence(TEMPO_ORIGINAL_DESCRIPTION).workModel).toBe("remote");
    expect(extractJobIntelligence(TEMPO_ORIGINAL_DESCRIPTION).mentionedLocations).toEqual(
      expect.arrayContaining(["Brazil", "Argentina", "India", "Philippines"]),
    );
    expect(extractJobIntelligence("Vaga remota no Brasil para time distribuído.").workModel).toBe("remote");
    expect(extractJobIntelligence("Vaga remota no Brasil para time distribuído.").mentionedLocations).toContain("Brazil");
  });
});

describe("DOG-001 — equivalências proibidas e requisitos compostos", () => {
  it("PostgreSQL conhecido não prova Supabase", () => {
    const result = decide(TEMPO_ORIGINAL_DESCRIPTION);
    const supabase = matchBy(result, /^supabase$/i)[0] ?? result.matches.find((item) => item.requirement.skillHint === "Supabase");
    expect(supabase?.status).toBe("unknown");
    expect(supabase?.reason).toMatch(/postgres|postgresql|supabase/i);
  });

  it("Node.js / APIs não provam Edge Functions", () => {
    const result = decide(TEMPO_ORIGINAL_DESCRIPTION);
    const edge = result.matches.find((item) => /edge function/i.test(item.requirement.label));
    expect(edge?.status).toBe("unknown");
    expect(edge?.reason).not.toMatch(/direct evidence supports/i);
  });

  it("TypeScript genérico não exige backend; backend em TypeScript fica unknown sem evidência conjunta", () => {
    const result = decide(TEMPO_ORIGINAL_DESCRIPTION);
    const genericTs = result.matches.find(
      (item) => item.requirement.skillHint === "TypeScript" && !(item.requirement.qualifiers ?? []).includes("backend"),
    );
    const backendTs = result.matches.find((item) => /typescript on the backend|backend/i.test(item.requirement.label) && item.requirement.skillHint === "TypeScript");
    expect(genericTs?.status).toBe("proven");
    expect(genericTs?.reason).not.toMatch(/backend is not established/i);
    expect(backendTs?.status).toBe("unknown");
    expect(backendTs?.reason).toMatch(/backend/i);
  });

  it("variação só com TypeScript genérico prova TypeScript sem pedir backend", () => {
    const result = decide("Frontend Engineer\nStrong proficiency in TypeScript and modern React.");
    const ts = result.matches.find((item) => item.requirement.skillHint === "TypeScript");
    expect(ts?.status).toBe("proven");
    expect((ts?.requirement.qualifiers ?? []).includes("backend")).toBe(false);
    expect(result.matches.some((item) => /typescript on the backend/i.test(item.requirement.label))).toBe(false);
  });

  it("REST não é inferido de Node.js; OpenAPI declarado no perfil pode ser proven", () => {
    const without = decide(TEMPO_ORIGINAL_DESCRIPTION);
    expect(without.matches.find((item) => item.requirement.skillHint === "REST")?.status).toBe("unknown");
    expect(without.matches.find((item) => item.requirement.skillHint === "OpenAPI")?.status).toBe("unknown");

    const withApis = decide(TEMPO_ORIGINAL_DESCRIPTION, {
      skills: {
        React: null,
        TypeScript: null,
        Tailwind: null,
        Nodejs: null,
        PostgreSQL: null,
        REST: null,
        OpenAPI: null,
      },
    });
    expect(withApis.matches.find((item) => item.requirement.skillHint === "REST")?.status).toBe("proven");
    expect(withApis.matches.find((item) => item.requirement.skillHint === "OpenAPI")?.status).toBe("proven");
  });

  it("aceita Swagger como alias controlado de OpenAPI", () => {
    expect(extractJobIntelligence("Document APIs with Swagger.").detectedSkills).toContain("OpenAPI");
    expect(resolveSkillCanonicalKey("swagger")).toBe("OpenAPI");
    expect(resolveSkillCanonicalKey("restful")).toBe("REST");
    expect(resolveSkillCanonicalKey("postgres")).toBe("PostgreSQL");
    expect(resolveSkillCanonicalKey("Sadupabase")).toBeNull();
  });
});

describe("DOG-001 — local, horário, inglês e salário", () => {
  it("Brazil (Remote) é compatível com Santos/SP, Brasil e não passa work authorization", () => {
    const result = decide(TEMPO_ORIGINAL_DESCRIPTION);
    const location = result.gates.find((gate) => gate.type === "location");
    const auth = result.gates.find((gate) => gate.type === "work_authorization");
    expect(location?.result).toBe("pass");
    expect(location?.reason).toMatch(/brazil|brasil|santos/i);
    expect(location?.reason).toMatch(/not a work-authorization|authorization is evaluated separately/i);
    expect(auth?.result).toBe("not_applicable");
    expect(auth?.result).not.toBe("pass");
    expect(auth?.reason).toMatch(/not proof of authorization/i);
  });

  it("horário 9am–4pm EST fica unknown sem disponibilidade; preserva ambiguidade de DST", () => {
    const result = decide(TEMPO_ORIGINAL_DESCRIPTION);
    const hours = result.gates.find((gate) => gate.type === "hours");
    expect(hours?.result).toBe("unknown");
    expect(hours?.reason).toMatch(/9am\s*-\s*4pm EST/i);
    expect(hours?.reason).toMatch(/daylight|dst|summer|horário de verão|not specified/i);
    expect(hours?.result).not.toBe("pass");
    expect(hours?.result).not.toBe("fail");
  });

  it("Advanced vs Fluent alinha requisito e gate; conforto permanece unknown", () => {
    const result = decide(TEMPO_ORIGINAL_DESCRIPTION);
    const english = result.matches.find((item) => item.requirement.requirementType === "language");
    const gate = result.gates.find((item) => item.type === "english");
    expect(english?.status).toBe("partial");
    expect(gate?.result).toBe("unknown");
    expect(gate?.reason).toBe(english?.reason);
    expect(english?.reason).toMatch(/fluent/i);
    expect(english?.reason).toMatch(/advanced/i);
    expect(english?.reason).toMatch(/comfort|conforto/i);
    expect(gate?.result).not.toBe("pass");
  });

  it("Fluent confirmado com conforto atende Fluent; Basic vs Fluent é incompatibilidade", () => {
    const fluent = decide(TEMPO_ORIGINAL_DESCRIPTION, {
      englishLevel: "Fluent",
      comfortableInEnglish: true,
    });
    expect(fluent.matches.find((item) => item.requirement.requirementType === "language")?.status).toBe("proven");
    expect(fluent.gates.find((item) => item.type === "english")?.result).toBe("pass");

    const basic = decide(TEMPO_ORIGINAL_DESCRIPTION, { englishLevel: "Basic", comfortableInEnglish: false });
    expect(basic.matches.find((item) => item.requirement.requirementType === "language")?.status).toBe("gap");
    expect(basic.gates.find((item) => item.type === "english")?.result).toBe("fail");
  });

  it("salário sem periodicidade fica pendente e não vira bloqueio técnico sozinho", () => {
    const salaryOnly = decide(
      `Frontend Engineer
React and TypeScript.
Starting salary of $40,000 USD with the opportunity to increase to $60,000 USD`,
      { skills: { React: null, TypeScript: null } },
    );
    const salaryGate = salaryOnly.gates.find((gate) => gate.type === "salary");
    expect(salaryGate?.result).toBe("unknown");
    expect(salaryGate?.required).toBe(false);
    expect(salaryGate?.reason).toMatch(/periodicity|periodicidade/i);
    expect(salaryOnly.decision).not.toBe("skip");
    expect(salaryOnly.reasons.join(" ")).not.toMatch(/Salary mentioned/i);
  });

  it("variação com salário anual explícito registra a periodicidade da fonte", () => {
    const reqs = extractJobRequirements("Compensation is $40,000 USD per year.");
    const salary = reqs.find((item) => item.requirementType === "salary");
    expect(salary?.qualifiers).toEqual(expect.arrayContaining(["annual"]));
    expect(salary?.extractedText).toMatch(/per year/i);
  });
});

describe("DOG-001 — perfil incompleto vs incompatibilidade comprovada", () => {
  it("perfil incompleto na Tempo permanece needs_info, sem gap inventado de Supabase ou horário", () => {
    const result = decide(TEMPO_ORIGINAL_DESCRIPTION);
    expect(result.decision).toBe("needs_info");
    expect(result.matches.find((item) => /supabase/i.test(item.requirement.label) && item.status === "gap")).toBeUndefined();
    expect(result.matches.find((item) => item.requirement.requirementType === "schedule")?.status).toBe("unknown");
    expect(result.gates.find((gate) => gate.type === "hours")?.result).toBe("unknown");
  });

  it("US only + candidato no Brasil é incompatibilidade de localização, não de autorização", () => {
    const result = decide("Staff Engineer\nMust be located in the United States only. No remote. React required.");
    const location = result.gates.find((gate) => gate.type === "location");
    const auth = result.gates.find((gate) => gate.type === "work_authorization");
    expect(location?.result).toBe("fail");
    expect(auth?.type).toBe("work_authorization");
    expect(auth?.result).not.toBe("fail");
  });

  it("reeavalia a mesma vaga a partir do snapshot, sem duplicar nem alterar a descrição", () => {
    const profile = fictionalProfile();
    const job = ingestApplyFlowJob({
      description: TEMPO_ORIGINAL_DESCRIPTION,
      source: "paste",
      title: "Full-Stack Engineer (Remote)",
      company: "Tempo",
      url: "https://jobs.ashbyhq.com/tempo/374cb123-0dde-427f-a907-e59b66d14624/",
      profile,
      now: NOW,
      id: "job_mtwa1mau_cu40gjkw",
    });
    const stale = {
      ...job,
      jobContext: { ...job.jobContext, skills: ["React", "REST", "Tailwind", "TypeScript"] },
    };
    const refreshed = reevaluateApplyFlowJobMatch(stale, profile, undefined, NOW);
    expect(refreshed.id).toBe(job.id);
    expect(refreshed.descriptionSnapshot).toBe(job.descriptionSnapshot);
    expect(refreshed.descriptionSnapshot).toContain("Sadupabase");
    expect(refreshed.jobContext.skills).toEqual(
      expect.arrayContaining(["Supabase", "Supabase Edge Functions", "OpenAPI", "REST"]),
    );
  });
});

describe("DOG-001 — matching pontual de não-equivalência", () => {
  it("evidência só de PostgreSQL não casa Supabase", () => {
    const reqs = extractJobRequirements("Working experience with Supabase (Postgres/Auth/Storage).");
    const matches = matchRequirementsToEvidence(
      reqs,
      buildCandidateEvidence(fictionalProfile({ skills: { PostgreSQL: null } }), [], NOW),
    );
    expect(matches.find((item) => item.requirement.skillHint === "Supabase")?.status).toBe("unknown");
  });

  it("evidência só de Node.js não casa Edge Functions nem REST", () => {
    const reqs = extractJobRequirements("Supabase Edge Functions and REST APIs. Node.js is used internally.");
    const matches = matchRequirementsToEvidence(
      reqs,
      buildCandidateEvidence(fictionalProfile({ skills: { Nodejs: null } }), [], NOW),
    );
    expect(matches.find((item) => /edge function/i.test(item.requirement.label))?.status).toBe("unknown");
    expect(matches.find((item) => item.requirement.skillHint === "REST")?.status).toBe("unknown");
  });
});
