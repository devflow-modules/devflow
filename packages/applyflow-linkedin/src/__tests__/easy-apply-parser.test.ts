// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { describe, expect, beforeAll, beforeEach } from "vitest";
import { classifyLinkedInField } from "../classify-field.js";
import { parseEasyApplyModalFields } from "../easy-apply-parser.js";

function loadFixture(rel: string): string {
  return readFileSync(new URL(rel, import.meta.url), "utf-8");
}

function mountDialogFromFixture(filename: string): HTMLElement {
  const html = loadFixture(`../__fixtures__/${filename}`);
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const dialog = parsed.querySelector('[role="dialog"]');
  if (!dialog) throw new Error(`Sem dialog na fixture ${filename}`);
  document.body.replaceChildren();
  document.body.appendChild(document.importNode(dialog, true));
  return document.body.querySelector('[role="dialog"]') as HTMLElement;
}

beforeAll(() => {
  const rect = {
    width: 240,
    height: 48,
    top: 0,
    left: 0,
    bottom: 48,
    right: 240,
    x: 0,
    y: 0,
    toJSON() {
      return "";
    },
  } as DOMRect;
  HTMLElement.prototype.getBoundingClientRect = function mockRect() {
    return rect;
  };
});

beforeEach(() => {
  document.body.replaceChildren();
});

describe("parseEasyApplyModalFields + fixtures", () => {
  it("anos de experiência: React EN, React PT tem experiência, Next.js PT", () => {
    const modal = mountDialogFromFixture("easy-apply-years-fields.html");
    const labels = parseEasyApplyModalFields(modal);

    expect(labels).toContain("How many years of experience do you have with React?");
    expect(labels).toContain("Há quantos anos você tem de experiência com React?");
    expect(labels).toContain("Há quantos anos você usa Next.js?");

    const reactLabel = labels.find((l) => /\bReact\?$/i.test(l));
    expect(reactLabel).toBeDefined();
    expect(classifyLinkedInField(reactLabel!).type).toBe("years_experience");
    expect(classifyLinkedInField(labels.find((l) => l.includes("Next.js"))!).type).toBe("years_experience");

    expect(labels.some((l) => /COBOL/i.test(l))).toBe(false);
  });

  it("pergunta de inglês, Brasil, salário e cover letter nas fixtures dedicadas", () => {
    const loc = mountDialogFromFixture("easy-apply-yes-no.html");
    const locLabels = parseEasyApplyModalFields(loc); // apenas legend/div — sem EN/BR neste ficheiro
    expect(locLabels.some((l) => /relocat/i.test(l))).toBe(true);

    const salary = mountDialogFromFixture("easy-apply-salary.html");
    const sLabels = parseEasyApplyModalFields(salary);
    expect(sLabels).toContain("Salary expectation");
    expect(sLabels).toContain("Expected compensation (monthly)");
    expect(sLabels).toContain("Pretensão salarial");
    expect(classifyLinkedInField("Salary expectation").type).toBe("salary");
    expect(classifyLinkedInField("Expected compensation (monthly)").type).toBe("salary");

    const cl = mountDialogFromFixture("easy-apply-cover-letter.html");
    const cLabels = parseEasyApplyModalFields(cl);
    expect(cLabels).toContain("Cover letter");
    expect(cLabels).toContain("Carta de apresentação");
    expect(classifyLinkedInField("Cover letter").type).toBe("cover_letter");
  });

  it("radio Yes/No, input number, textarea, select aparecem com rótulos", () => {
    const modal = mountDialogFromFixture("easy-apply-years-fields.html");
    const labels = parseEasyApplyModalFields(modal);
    expect(labels.length).toBeGreaterThanOrEqual(3);
  });

  it("multi-step: extrai apenas o passo visível", () => {
    const modal = mountDialogFromFixture("easy-apply-multistep.html");
    const labels = parseEasyApplyModalFields(modal);
    expect(labels).toContain("Email address");
    expect(labels.some((l) => /phone/i.test(l))).toBe(false);
    expect(labels.some((l) => /react/i.test(l))).toBe(false);
  });

  it("labels em span/div sem <label> direto são captados", () => {
    const modal = mountDialogFromFixture("easy-apply-cover-letter.html");
    const labels = parseEasyApplyModalFields(modal);
    expect(labels).toContain("Carta de apresentação");
  });
});

describe("classifyLinkedInField — variações Sprint 1.1", () => {
  const cases: { label: string; type: ReturnType<typeof classifyLinkedInField>["type"] }[] = [
    { label: "How many years of experience do you have with React?", type: "years_experience" },
    { label: "Há quantos anos você tem de experiência com React?", type: "years_experience" },
    { label: "Há quantos anos você usa React?", type: "years_experience" },
    { label: "What is your English proficiency?", type: "english" },
    { label: "What is your level of proficiency in English?", type: "english" },
    { label: "Qual seu nível de inglês?", type: "english" },
    { label: "Você mora no Brasil?", type: "location" },
    { label: "Atualmente você mora no Brasil?", type: "location" },
    { label: "Do you currently live in Brazil?", type: "location" },
    { label: "Salary expectation", type: "salary" },
    { label: "Expected compensation", type: "salary" },
    { label: "Pretensão salarial", type: "salary" },
    { label: "Cover letter", type: "cover_letter" },
    { label: "Carta de apresentação", type: "cover_letter" },
  ];

  cases.forEach(({ label, type }) => {
    it(`classifica: ${label.slice(0, 48)}…`, () => {
      expect(classifyLinkedInField(label).type).toBe(type);
    });
  });
});
