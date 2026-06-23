import { describe, expect, it } from "vitest";
import { __resumeAnalystTestUtils } from "../../../../../packages/career-core/src/career-agents/agents/resume-analyst";
import {
  classifyResumeLine,
  extractResumeBulletLines,
  extractResumeExperiences,
  isExperienceHeader,
  parseExperienceHeader,
} from "./career-pilot-resume-line-parser";

const MARIA_RESUME = `Maria Souza — Desenvolvedora de Software Sênior

Experiência profissional
TechCorp (2021–presente) — Desenvolvedora Backend
Desenvolvi APIs REST em Node.js para integração com parceiros.
Reduzi o tempo de deploy em 30% com pipelines CI/CD.
Liderei um squad de 4 pessoas em projeto de migração cloud.`;

describe("isExperienceHeader", () => {
  it.each([
    "TechCorp (2021–presente) — Desenvolvedora Backend",
    "TechCorp — Desenvolvedora Backend — 2021–2024",
    "TechCorp | Desenvolvedora Backend | 2021–2024",
    "Desenvolvedora Backend — TechCorp — jan/2021 a dez/2023",
    "TechCorp (2021 - atual)",
    "Empresa X — Engenheiro de Software",
  ])("detects experience header: %s", (line) => {
    expect(isExperienceHeader(line)).toBe(true);
  });

  it.each([
    "Reduzi o tempo de deploy em 30% entre 2021 e 2023.",
    "Liderei 4 pessoas durante a migração de 2022.",
    "Desenvolvi a plataforma usada por 10 mil usuários.",
    "Desenvolvi APIs REST em Node.js para integração com parceiros.",
  ])("does not treat action bullets as headers: %s", (line) => {
    expect(isExperienceHeader(line)).toBe(false);
  });
});

describe("parseExperienceHeader", () => {
  it("parses company, title and period from parenthetical format", () => {
    expect(parseExperienceHeader("TechCorp (2021–presente) — Desenvolvedora Backend")).toEqual({
      company: "TechCorp",
      title: "Desenvolvedora Backend",
      period: "2021–presente",
    });
  });

  it("parses pipe-separated format", () => {
    const parsed = parseExperienceHeader("TechCorp | Desenvolvedora Backend | 2021–2024");
    expect(parsed?.company).toBe("TechCorp");
    expect(parsed?.title).toBe("Desenvolvedora Backend");
    expect(parsed?.period).toBe("2021–2024");
  });

  it("parses role-first format with month range", () => {
    const parsed = parseExperienceHeader("Desenvolvedora Backend — TechCorp — jan/2021 a dez/2023");
    expect(parsed?.company).toBe("TechCorp");
    expect(parsed?.title).toBe("Desenvolvedora Backend");
    expect(parsed?.period).toMatch(/jan\/2021/i);
  });
});

describe("extractResumeExperiences", () => {
  it("P1 — excludes experience headers from bullets (Maria fixture)", () => {
    const summary = "Desenvolvedora de Software Sênior";
    const experiences = extractResumeExperiences(MARIA_RESUME, summary);
    expect(experiences).toHaveLength(1);
    expect(experiences[0]?.company).toBe("TechCorp");
    expect(experiences[0]?.title).toBe("Desenvolvedora Backend");
    expect(experiences[0]?.bullets).toHaveLength(3);
    expect(experiences[0]?.bullets.some((bullet) => bullet.includes("TechCorp"))).toBe(false);
    expect(experiences[0]?.bullets.some((bullet) => bullet.includes("2021"))).toBe(false);
  });

  it("keeps real bullets with years in the sentence", () => {
    const experiences = extractResumeExperiences(
      "TechCorp (2021–presente) — Backend\nReduzi custos em 20% entre 2021 e 2023.",
    );
    expect(experiences[0]?.bullets).toEqual(["Reduzi custos em 20% entre 2021 e 2023."]);
    expect(__resumeAnalystTestUtils.hasMeaningfulMetric(experiences[0]?.bullets[0] ?? "")).toBe(true);
  });

  it("classifies action lines as bullets before headers", () => {
    expect(classifyResumeLine("Desenvolvi APIs REST em Node.js para integração com parceiros.")).toBe(
      "bullet",
    );
    expect(classifyResumeLine("Responsável por algumas tarefas.")).not.toBe("experience_header");
  });
});

describe("extractResumeBulletLines", () => {
  it("returns only bullet lines without headers", () => {
    const lines = extractResumeBulletLines(MARIA_RESUME, "Desenvolvedora de Software Sênior");
    expect(lines).toHaveLength(3);
    expect(lines.every((line) => !isExperienceHeader(line))).toBe(true);
  });
});
