import { describe, expect, it } from "vitest";
import { classifyLinkedInField } from "../classify-field.js";

describe("classifyLinkedInField", () => {
  it("anos com React (EN)", () => {
    const r = classifyLinkedInField("How many years of experience do you have with React?");
    expect(r.type).toBe("years_experience");
    expect(r.skill).toBe("react");
    expect(r.confidence).not.toBe("low");
  });

  it("anos com React (PT)", () => {
    const r = classifyLinkedInField("Há quantos anos você usa React?");
    expect(r.type).toBe("years_experience");
    expect(r.skill).toBe("react");
  });

  it("nível de inglês (EN)", () => {
    const r = classifyLinkedInField("What is your level of proficiency in English?");
    expect(r.type).toBe("english");
  });

  it("nível de inglês (PT)", () => {
    const r = classifyLinkedInField("Qual seu nível de inglês?");
    expect(r.type).toBe("english");
  });

  it("mora no Brasil (EN)", () => {
    const r = classifyLinkedInField("Do you currently live in Brazil?");
    expect(r.type).toBe("location");
  });

  it("mora no Brasil (PT)", () => {
    const r = classifyLinkedInField("Atualmente você mora no Brasil?");
    expect(r.type).toBe("location");
  });

  it("salary expectation", () => {
    expect(classifyLinkedInField("Salary expectation").type).toBe("salary");
  });

  it("pretensão salarial", () => {
    expect(classifyLinkedInField("Pretensão salarial").type).toBe("salary");
  });

  it("cover letter", () => {
    expect(classifyLinkedInField("Cover letter").type).toBe("cover_letter");
  });

  it("carta de apresentação", () => {
    expect(classifyLinkedInField("Carta de apresentação").type).toBe("cover_letter");
  });
});
