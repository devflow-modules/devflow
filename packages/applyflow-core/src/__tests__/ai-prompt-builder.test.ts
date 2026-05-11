import { describe, expect, it } from "vitest";

import { buildAiPrompt } from "../ai-prompt-builder.js";
import type { CandidateProfile } from "../profile-schema.js";

const baseProfile: CandidateProfile = {
  name: "Test User",
  location: "Lisboa",
  englishLevel: "Intermediate",
  comfortableInEnglish: true,
  roles: ["Fullstack"],
  skills: {
    React: 5,
    Nextjs: 0,
    TypeScript: 4,
    Nodejs: 3,
    Python: 0,
    PostgreSQL: 2,
    Prisma: 0,
    Docker: 1,
    Jest: 2,
    Playwright: 0,
    Tailwind: 2,
    AWS: 0,
    Java: 0,
    Elixir: 0,
    Ruby: 0,
    WordPress: 0,
    HTML: 5,
    CSS: 5,
    Git: 5,
    CI_CD: 1,
  },
  salary: {
    cltPleno: "x",
    cltSenior: "x",
    pjSenior: "x",
    usdMonthly: "x",
    usdHourly: "x",
  },
};

describe("buildAiPrompt", () => {
  it("inclui instrução de não inventar experiência (PT)", () => {
    const { user, system } = buildAiPrompt({
      task: "cover_letter",
      candidateProfile: baseProfile,
      language: "pt",
      jobTitle: "Dev",
    });
    expect(system).toMatch(/Não inventar|não inventar/i);
    expect(user).toContain("cover_letter");
    expect(user).toContain("Test User");
  });

  it("inclui instrução anti-invenção (EN)", () => {
    const { system } = buildAiPrompt({
      task: "open_answer",
      candidateProfile: baseProfile,
      language: "en",
      questionLabel: "Why this role?",
    });
    expect(system).toMatch(/Do not invent|not invent/i);
  });

  it("perfil serializado inclui skill com 0 anos e instruções não permitem afirmar domínio", () => {
    const { user, system } = buildAiPrompt({
      task: "open_answer",
      candidateProfile: baseProfile,
      language: "pt",
    });
    expect(user).toContain('"Nextjs": 0');
    expect(system).toMatch(/anos = 0|Se anos = 0/i);
    expect(system).toMatch(/não afirmar domínio|domínio nem experiência/i);
  });

  it("tarefa cover_letter", () => {
    const { user } = buildAiPrompt({
      task: "cover_letter",
      candidateProfile: baseProfile,
      language: "pt",
    });
    expect(user).toMatch(/3 a 5 parágrafos|carta de apresentação/i);
  });

  it("tarefa open_answer", () => {
    const { user } = buildAiPrompt({
      task: "open_answer",
      candidateProfile: baseProfile,
      language: "pt",
      questionLabel: "Motivação",
    });
    expect(user).toContain("Motivação");
    expect(user).toMatch(/objectiva|Responde/i);
  });

  it("respeita language pt vs en nas instruções da tarefa", () => {
    const pt = buildAiPrompt({ task: "fit_summary", candidateProfile: baseProfile, language: "pt" }).user;
    const en = buildAiPrompt({ task: "fit_summary", candidateProfile: baseProfile, language: "en" }).user;
    expect(pt).toMatch(/bullets|alinhamento/i);
    expect(en).toMatch(/bullet|fit summary/i);
  });
});
