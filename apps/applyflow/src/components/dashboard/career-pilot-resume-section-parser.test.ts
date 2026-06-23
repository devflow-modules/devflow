import { describe, expect, it } from "vitest";
import { __resumeAnalystTestUtils } from "../../../../../packages/career-core/src/career-agents/agents/resume-analyst";
import { buildCareerSpecialistFieldsFromSimpleInputs } from "./career-pilot-input-normalizer";
import { EMPTY_CAREER_PILOT_SIMPLE_INPUTS } from "./career-pilot-simple-inputs";
import {
  classifyMetricContext,
  classifyResumeBulletKind,
  isContactLine,
  isSectionHeading,
  joinPdfBrokenLines,
  parseResumeDocument,
  type ResumeBulletKind,
} from "./career-pilot-resume-section-parser";
import {
  ACADEMIC_HEAVY_RESUME,
  NO_HEADINGS_RESUME,
  PDF_BROKEN_LINES_RESUME,
  REALISTIC_MULTI_SECTION_RESUME,
  SKILLS_HEAVY_RESUME,
} from "./fixtures/realistic-multisection-resume.fixture";

const { hasMeaningfulMetric } = __resumeAnalystTestUtils;

describe("career-pilot-resume-section-parser", () => {
  it("Fixture F — realistic multi-section resume", () => {
    const doc = parseResumeDocument(REALISTIC_MULTI_SECTION_RESUME);

    expect(doc.summary).toMatch(/SaaS|APIs|automa/i);
    expect(doc.experiences).toHaveLength(2);
    expect(doc.experiences[0]?.company).toBe("DevStudio Labs");
    expect(doc.experiences[0]?.title).toMatch(/Founder|Product Engineer/i);
    expect(doc.experiences[1]?.company).toBe("Tech Solutions");
    expect(doc.projects.length).toBeGreaterThanOrEqual(2);
    expect(doc.skills.length).toBeGreaterThanOrEqual(12);
    expect(doc.skills.length).toBeLessThanOrEqual(18);
    expect(doc.education.length).toBeGreaterThanOrEqual(1);
    expect(doc.languages.length).toBe(3);
    expect(doc.contactLines.length).toBeGreaterThanOrEqual(1);

    const bullets = doc.experiences.flatMap((exp) => exp.bullets);
    expect(bullets.length).toBeGreaterThanOrEqual(6);
    expect(bullets.length).toBeLessThanOrEqual(12);

    for (const bullet of bullets) {
      expect(isSectionHeading(bullet)).toBe(false);
      expect(classifyResumeBulletKind(bullet)).not.toBe("invalid_fragment");
    }

    expect(bullets.some((bullet) => bullet.includes("30%"))).toBe(true);
    expect(bullets.some((bullet) => bullet.includes("4 pessoas"))).toBe(true);
    expect(bullets.join("\n")).not.toMatch(/JavaScript|PostgreSQL|Português|Pós-graduação/i);
    expect(doc.confidence).not.toBe("low");
  });

  it("Fixture G — PDF broken lines join", () => {
    const joined = joinPdfBrokenLines(PDF_BROKEN_LINES_RESUME.split("\n"));
    expect(joined.some((line) => /Next\.js e TypeScript/i.test(line))).toBe(true);

    const doc = parseResumeDocument(PDF_BROKEN_LINES_RESUME);
    const bullets = doc.experiences.flatMap((exp) => exp.bullets);
    expect(bullets.some((bullet) => /Next\.js e TypeScript/i.test(bullet))).toBe(true);
  });

  it("Fixture H — resume without headings", () => {
    const doc = parseResumeDocument(NO_HEADINGS_RESUME);
    expect(doc.experiences.length).toBeGreaterThanOrEqual(1);
    expect(doc.skills.length).toBeGreaterThanOrEqual(4);
    expect(doc.experiences.flatMap((exp) => exp.bullets).length).toBeGreaterThanOrEqual(2);
  });

  it("Fixture I — many skills and few experiences", () => {
    const doc = parseResumeDocument(SKILLS_HEAVY_RESUME);
    expect(doc.skills.length).toBeGreaterThanOrEqual(10);
    expect(doc.experiences.length).toBe(1);
    expect(doc.experiences[0]?.bullets.length).toBeGreaterThanOrEqual(1);
  });

  it("Fixture J — academic heavy resume", () => {
    const doc = parseResumeDocument(ACADEMIC_HEAVY_RESUME);
    expect(doc.education.length + doc.certifications.length).toBeGreaterThanOrEqual(3);
    expect(doc.experiences.flatMap((exp) => exp.bullets).join("\n")).not.toMatch(/Pós-graduação|40 horas/i);
    expect(hasMeaningfulMetric("Curso de Node.js — 40 horas")).toBe(false);
    expect(classifyMetricContext("Curso de Node.js — 40 horas")).toBe("course_duration");
  });

  it("property invariants — headings and contact never become bullets", () => {
    const samples: Array<{ text: string; kind: ResumeBulletKind }> = [
      { text: "EXPERIÊNCIA PROFISSIONAL", kind: "invalid_fragment" },
      { text: "COMPETÊNCIAS TÉCNICAS", kind: "invalid_fragment" },
      { text: "email@example.com", kind: "invalid_fragment" },
      { text: "2024", kind: "invalid_fragment" },
      { text: "JavaScript", kind: "invalid_fragment" },
      { text: "Node.js 20", kind: "invalid_fragment" },
    ];
    for (const sample of samples) {
      expect(classifyResumeBulletKind(sample.text)).toBe(sample.kind);
    }
    expect(isContactLine("email@example.com")).toBe(true);
    expect(isSectionHeading("COMPETÊNCIAS TÉCNICAS")).toBe(true);
  });

  it("maps to specialist fields without contact in bullets", () => {
    const fields = buildCareerSpecialistFieldsFromSimpleInputs(
      { ...EMPTY_CAREER_PILOT_SIMPLE_INPUTS, targetRole: "Desenvolvedor Full Stack", resumeText: REALISTIC_MULTI_SECTION_RESUME },
      "analyze_resume",
    );
    const bullets = fields.resumeBullets.split("\n").filter(Boolean);
    expect(bullets.length).toBeGreaterThanOrEqual(6);
    expect(bullets.join("\n")).not.toMatch(/linkedin|github|example\.com/i);
    expect(fields.resumeSkills.split(",").length).toBeGreaterThanOrEqual(12);
    expect(fields.resumeParseConfidence).not.toBe("low");
    expect(fields.resumeProjectsJson).not.toBe("[]");
  });
});
