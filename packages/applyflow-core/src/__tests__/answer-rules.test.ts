import { describe, expect, it } from "vitest";
import { getSuggestedAnswer } from "../answer-rules.js";
import { gustavoProfile } from "../candidate-profile.js";

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

  it("Tell us about yourself → answer bank do perfil padrão", () => {
    const r = getSuggestedAnswer("Tell us about yourself");
    expect(r.confidence).toBe("high");
    expect(r.value).toContain("Senior Frontend");
  });

  it("Why are you a good fit? → answer bank", () => {
    const r = getSuggestedAnswer("Why are you a good fit for this role?");
    expect(r.confidence).toBe("high");
    expect(r.value).toContain("strong fit");
  });

  it("Availability to start → answer bank", () => {
    const r = getSuggestedAnswer("Availability to start");
    expect(r.confidence).toBe("high");
    expect(r.value).toContain("remote");
  });

  it("English-speaking environment → availability (texto longo)", () => {
    const r = getSuggestedAnswer("Are you comfortable in an English-speaking environment?");
    expect(r.confidence).toBe("high");
    expect(r.value).toContain("English");
    expect(r.value).not.toMatch(/^(Yes|No)$/);
  });

  it("answer bank vazio mantém fallback genérico para pergunta aberta", () => {
    const emptyBank = {
      ...gustavoProfile,
      answerBank: {
        professionalSummary: "",
        tellUsAboutYourself: "",
        whyGoodFit: "",
        availability: "",
      },
    };
    const r = getSuggestedAnswer("Tell us about yourself", emptyBank);
    expect(r.confidence).toBe("low");
    expect(r.value).toBe("");
  });
});

describe("Sprint 7.3 — labels PT-BR e EN (answer bank)", () => {
  it("PT: Fale sobre você → tellUsAboutYourself", () => {
    const r = getSuggestedAnswer("Fale sobre você");
    expect(r.confidence).toBe("high");
    expect(r.value).toContain("Senior Frontend");
  });

  it("PT: Por que devemos te contratar? → whyGoodFit", () => {
    const r = getSuggestedAnswer("Por que devemos te contratar?");
    expect(r.confidence).toBe("high");
    expect(r.value).toContain("strong fit");
  });

  it("PT: Descreva sua experiência profissional → professionalSummary", () => {
    const r = getSuggestedAnswer("Descreva sua experiência profissional");
    expect(r.confidence).toBe("high");
    expect(r.value).toContain("DevFlow Labs");
  });

  it("PT: Quando você pode começar? → availability", () => {
    const r = getSuggestedAnswer("Quando você pode começar?");
    expect(r.confidence).toBe("high");
    expect(r.value).toContain("remote");
  });

  it("PT: confortável trabalhando em inglês (texto longo) → availability, não Sim/Não", () => {
    const r = getSuggestedAnswer("Você se sente confortável trabalhando em inglês?");
    expect(r.confidence).toBe("high");
    expect(r.value).toContain("English");
    expect(r.value).not.toMatch(/^(Yes|No)$/);
  });

  it("EN: why do you want to work here → whyGoodFit", () => {
    const r = getSuggestedAnswer("Why do you want to work here?");
    expect(r.confidence).toBe("high");
    expect(r.value).toContain("strong fit");
  });

  it("EN: professional experience → professionalSummary", () => {
    const r = getSuggestedAnswer("Describe your professional experience");
    expect(r.confidence).toBe("high");
    expect(r.value).toContain("SaaS");
  });

  it("ES: resumen sobre ti → tellUsAboutYourself, não professionalSummary", () => {
    const r = getSuggestedAnswer("Resumen sobre ti");
    expect(r.confidence).toBe("high");
    expect(r.value).toContain("Senior Frontend");
  });
});

describe("Sprint 7.4 — labels ES (answer bank)", () => {
  it("Cuéntanos sobre ti → tellUsAboutYourself", () => {
    const r = getSuggestedAnswer("Cuéntanos sobre ti");
    expect(r.confidence).toBe("high");
    expect(r.value).toContain("Senior Frontend");
  });

  it("Preséntate brevemente → tellUsAboutYourself", () => {
    const r = getSuggestedAnswer("Preséntate brevemente");
    expect(r.confidence).toBe("high");
    expect(r.value).toContain("Senior Frontend");
  });

  it("¿Por qué deberíamos contratarte? → whyGoodFit", () => {
    const r = getSuggestedAnswer("¿Por qué deberíamos contratarte?");
    expect(r.confidence).toBe("high");
    expect(r.value).toContain("strong fit");
  });

  it("¿Por qué quieres trabajar aquí? → whyGoodFit", () => {
    const r = getSuggestedAnswer("¿Por qué quieres trabajar aquí?");
    expect(r.confidence).toBe("high");
    expect(r.value).toContain("strong fit");
  });

  it("Porque eres un buen candidato para este puesto → whyGoodFit", () => {
    const r = getSuggestedAnswer("Porque eres un buen candidato para este puesto");
    expect(r.confidence).toBe("high");
    expect(r.value).toContain("strong fit");
  });

  it("Describe tu experiencia profesional → professionalSummary", () => {
    const r = getSuggestedAnswer("Describe tu experiencia profesional");
    expect(r.confidence).toBe("high");
    expect(r.value).toContain("DevFlow Labs");
  });

  it("Carta de presentación → professionalSummary", () => {
    const r = getSuggestedAnswer("Carta de presentación");
    expect(r.confidence).toBe("high");
    expect(r.value).toContain("SaaS");
  });

  it("Resumen profesional → professionalSummary", () => {
    const r = getSuggestedAnswer("Resumen profesional");
    expect(r.confidence).toBe("high");
    expect(r.value).toContain("DevFlow Labs");
  });

  it("¿Cuándo puedes empezar? → availability", () => {
    const r = getSuggestedAnswer("¿Cuándo puedes empezar?");
    expect(r.confidence).toBe("high");
    expect(r.value).toContain("remote");
  });

  it("Disponibilidad para trabajo remoto → availability", () => {
    const r = getSuggestedAnswer("Disponibilidad para trabajo remoto");
    expect(r.confidence).toBe("high");
    expect(r.value).toContain("remote");
  });

  it("¿Te sientes cómodo trabajando en inglés? → availability (texto longo)", () => {
    const r = getSuggestedAnswer("¿Te sientes cómodo trabajando en inglés?");
    expect(r.confidence).toBe("high");
    expect(r.value).toContain("English");
    expect(r.value).not.toMatch(/^(Yes|No)$/);
  });

  it("ES curto: cómodo con inglés → Sim/Não", () => {
    const r = getSuggestedAnswer("¿Te sientes cómodo con inglés?");
    expect(r.value).toBe("Yes");
    expect(r.confidence).toBe("high");
  });
});
