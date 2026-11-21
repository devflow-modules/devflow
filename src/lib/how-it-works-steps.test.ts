import { describe, expect, it } from "vitest";
import { HOW_IT_WORKS_ILLUSTRATIVE_EXAMPLE, HOW_IT_WORKS_STEPS } from "./how-it-works-steps";

describe("how-it-works-steps", () => {
  it("mantém exatamente quatro etapas na ordem comercial", () => {
    expect(HOW_IT_WORKS_STEPS.map((step) => step.title)).toEqual([
      "Diagnóstico da operação",
      "Desenho dos fluxos",
      "Implementação técnica",
      "Operação acompanhada",
    ]);
    expect(HOW_IT_WORKS_STEPS.map((step) => step.number)).toEqual(["01", "02", "03", "04"]);
  });

  it("exige summary e detalhe completo em cada etapa", () => {
    for (const step of HOW_IT_WORKS_STEPS) {
      expect(step.summary.length).toBeGreaterThan(20);
      expect(step.happens.length).toBeGreaterThan(20);
      expect(step.clientRole.length).toBeGreaterThan(20);
      expect(step.outcome.length).toBeGreaterThan(20);
    }
  });

  it("marca o exemplo de comercial × suporte como ilustrativo", () => {
    expect(HOW_IT_WORKS_ILLUSTRATIVE_EXAMPLE.label).toBe("Exemplo ilustrativo");
    expect(HOW_IT_WORKS_ILLUSTRATIVE_EXAMPLE.body).toMatch(/filas/i);
    expect(HOW_IT_WORKS_ILLUSTRATIVE_EXAMPLE.body).not.toMatch(/\bSLA\b|\b24\/7\b|\d+%/);
  });
});
