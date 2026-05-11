import { describe, expect, it } from "vitest";

import { extractJobIntelligence, normalizeJobTextForIntel } from "../job-intelligence.js";

describe("normalizeJobTextForIntel", () => {
  it("remove diacríticos", () => {
    expect(normalizeJobTextForIntel("  Pleno  Júnior ")).toContain("pleno");
    expect(normalizeJobTextForIntel("Inglês")).toContain("ingles");
  });
});

describe("extractJobIntelligence", () => {
  it("retorna unknown quando vazio", () => {
    const x = extractJobIntelligence("   ");
    expect(x.seniority).toBe("unknown");
    expect(x.roleType).toBe("unknown");
    expect(x.workModel).toBe("unknown");
    expect(x.contractType).toBe("unknown");
    expect(x.englishRequired).toBe(false);
    expect(x.detectedSkills).toEqual([]);
    expect(x.salaryMentioned).toBe(false);
  });

  it("detecta senioridade senior PT/EN", () => {
    expect(extractJobIntelligence("Buscamos desenvolvedor Senior React").seniority).toBe("senior");
    expect(extractJobIntelligence("Especialista em backend Node").seniority).toBe("senior");
    expect(extractJobIntelligence("Sr. Software Engineer").seniority).toBe("senior");
  });

  it("detecta pleno/mid", () => {
    expect(extractJobIntelligence("Desenvolvedor pleno em Python").seniority).toBe("mid");
    expect(extractJobIntelligence("Mid-level engineer").seniority).toBe("mid");
  });

  it("detecta frontend", () => {
    expect(extractJobIntelligence("Front-end com React e TypeScript").roleType).toBe("frontend");
    expect(extractJobIntelligence("Expert in Next.js apps").roleType).toBe("frontend");
  });

  it("detecta backend", () => {
    expect(extractJobIntelligence("Backend engineer with NestJS and PostgreSQL").roleType).toBe("backend");
    expect(extractJobIntelligence("API development in Java and Spring").roleType).toBe("backend");
  });

  it("detecta fullstack", () => {
    expect(extractJobIntelligence("Full-stack developer React + Node").roleType).toBe("fullstack");
  });

  it("detecta remoto / híbrido / presencial", () => {
    expect(extractJobIntelligence("Trabalho 100% remoto").workModel).toBe("remote");
    expect(extractJobIntelligence("Remote first company").workModel).toBe("remote");
    expect(extractJobIntelligence("Modelo híbrido em São Paulo").workModel).toBe("hybrid");
    expect(extractJobIntelligence("Posição presencial no escritório").workModel).toBe("onsite");
  });

  it("detecta CLT / PJ / contractor / internship", () => {
    expect(extractJobIntelligence("Contrato CLT").contractType).toBe("clt");
    expect(extractJobIntelligence("Modelo PJ").contractType).toBe("pj");
    expect(extractJobIntelligence("Looking for contractor").contractType).toBe("contractor");
    expect(extractJobIntelligence("Estágio em engenharia").contractType).toBe("internship");
  });

  it("detecta inglês exigido", () => {
    expect(extractJobIntelligence("Fluent English required").englishRequired).toBe(true);
    expect(extractJobIntelligence("Inglês avançado obrigatório").englishRequired).toBe(true);
  });

  it("detecta salaryMentioned", () => {
    expect(extractJobIntelligence("Compensation between 10k and 15k USD").salaryMentioned).toBe(true);
    expect(extractJobIntelligence("Faixa salarial competitiva").salaryMentioned).toBe(true);
    expect(extractJobIntelligence("Pretensão salarial").salaryMentioned).toBe(true);
  });

  it("detecta e deduplica skills", () => {
    const x = extractJobIntelligence(
      "Stack: React, TypeScript, PostgreSQL, react, NODE.JS e tailwind css",
    );
    expect(x.detectedSkills).toContain("React");
    expect(x.detectedSkills).toContain("TypeScript");
    expect(x.detectedSkills).toContain("PostgreSQL");
    expect(x.detectedSkills).toContain("Node.js");
    expect(new Set(x.detectedSkills).size).toBe(x.detectedSkills.length);
  });

  it("junior SR token não sobe para senior quando só JR junior", () => {
    expect(extractJobIntelligence("Vaga junior para estagiário").seniority).toBe("junior");
  });
});
