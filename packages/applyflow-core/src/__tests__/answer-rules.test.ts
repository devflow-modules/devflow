import { describe, expect, it } from "vitest";
import { getSuggestedAnswer } from "../answer-rules.js";

describe("getSuggestedAnswer", () => {
  it("anos com React → valor do perfil padrão", () => {
    const r = getSuggestedAnswer("How many years of experience do you have with React?");
    expect(r.value).toBe("5");
    expect(r.confidence).toBe("high");
  });

  it("anos com Next.js → 5", () => {
    const r = getSuggestedAnswer("years of experience with Next.js");
    expect(r.value).toBe("5");
  });

  it("anos com Node.js → 5", () => {
    const r = getSuggestedAnswer("years of experience with Node.js");
    expect(r.value).toBe("5");
  });

  it("anos com TypeScript → 5", () => {
    const r = getSuggestedAnswer("years of experience with TypeScript");
    expect(r.value).toBe("5");
  });

  it("anos com AWS → 1 e aviso", () => {
    const r = getSuggestedAnswer("years of experience with AWS");
    expect(r.value).toBe("1");
    expect(r.warning).toBeDefined();
  });

  it("anos com Elixir → 0 e aviso", () => {
    const r = getSuggestedAnswer("years of experience with Elixir");
    expect(r.value).toBe("0");
    expect(r.warning).toBeDefined();
  });

  it("English proficiency → Advanced", () => {
    const r = getSuggestedAnswer("What is your level of proficiency in English?");
    expect(r.value).toBe("Advanced");
  });

  it("comfortable working in English → Yes", () => {
    const r = getSuggestedAnswer("Are you comfortable working in English?");
    expect(r.value).toBe("Yes");
  });

  it("mora no Brasil → Yes (perfil Brasil)", () => {
    const r = getSuggestedAnswer("Do you currently live in Brazil?");
    expect(r.value).toBe("Yes");
  });

  it("contractor USD inclui texto do perfil", () => {
    const r = getSuggestedAnswer("What is your monthly salary expectation in USD as a contractor?");
    expect(r.value).toContain("USD");
    expect(r.value).toContain("4,500");
    expect(r.value.toLowerCase()).toContain("month");
    expect(r.value.toLowerCase()).toContain("contractor");
  });

  it("CLT Senior inclui valores do perfil", () => {
    const r = getSuggestedAnswer("Expected CLT Senior monthly salary");
    expect(r.value).toContain("14.500");
    expect(r.value).toContain("CLT");
  });

  it("PJ Senior inclui valores do perfil", () => {
    const r = getSuggestedAnswer("PJ Senior compensation expectation");
    expect(r.value).toContain("17.500");
    expect(r.value).toContain("PJ");
  });
});
