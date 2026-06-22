import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { CareerPilotResultModel } from "./career-pilot-result-mapper";
import { CareerPilotResultView } from "./career-pilot-result-view";
import { CareerPilotFeedback } from "./career-pilot-feedback";

const model: CareerPilotResultModel = {
  flowTitle: "Análise do currículo",
  summary: "Seu currículo comunica experiência técnica, mas pode destacar resultados com mais clareza.",
  strengths: ["Experiência com TypeScript", "Histórico de entrega contínua"],
  improvements: ["Adicionar métricas nas experiências recentes"],
  nextActions: [
    "Adicione resultados mensuráveis às experiências recentes.",
    "Inclua as tecnologias obrigatórias citadas na vaga.",
    "Revise o resumo profissional.",
  ],
  risks: ["Bullets genéricos podem reduzir impacto"],
  scores: [{ label: "Qualidade da estrutura", value: 72, max: 100 }],
  evidence: ["Experiências: detalhar impacto"],
  bulletSuggestions: [
    {
      original: "Desenvolvi APIs REST em Node.js.",
      recommendation: "Explique quantos parceiros foram integrados, somente se esses dados forem reais.",
    },
  ],
  humanReviewNotice: "Revise cada sugestão com critério humano antes de alterar seu currículo.",
  technicalLines: ["Nenhuma candidatura foi enviada."],
  traceSteps: [{ code: "review_required", message: "Human review required" }],
};

describe("CareerPilotResultView", () => {
  it("renders participant hierarchy with technical details hidden by default", () => {
    const html = renderToStaticMarkup(<CareerPilotResultView model={model} intent="analyze_resume" />);

    expect(html.indexOf("Resumo")).toBeLessThan(html.indexOf("Principais achados"));
    expect(html.indexOf("Principais achados")).toBeLessThan(html.indexOf("Sugestões por experiência"));
    expect(html.indexOf("Sugestões por experiência")).toBeLessThan(html.indexOf("Próximas ações"));
    expect(html.indexOf("Próximas ações")).toBeLessThan(html.indexOf("Pontos de atenção"));
    expect(html).toContain("career-pilot-result-review-notice");
    expect(html).not.toContain("Detalhes técnicos");
    expect(html).not.toContain("review_required");
    expect(html).not.toContain("Agent response");
  });

  it("shows technical details only in diagnostic surface", () => {
    const html = renderToStaticMarkup(
      <CareerPilotResultView model={model} intent="analyze_resume" participantSurface={false} />,
    );
    expect(html).toContain("Detalhes técnicos");
    expect(html).toContain("review_required");
  });

  it("shows Portuguese flow titles for the three pilot flows", () => {
    for (const title of [
      "Análise do currículo",
      "Compatibilidade com a vaga",
      "Plano de carreira",
    ]) {
      const html = renderToStaticMarkup(
        <CareerPilotResultView model={{ ...model, flowTitle: title }} />,
      );
      expect(html).toContain(title);
    }
  });

  it("limits visible numbered next actions to provided items", () => {
    const html = renderToStaticMarkup(<CareerPilotResultView model={model} intent="analyze_resume" />);
    const matches = html.match(/career-pilot-result-action-list/g) ?? [];
    expect(matches.length).toBeGreaterThan(0);
    expect(model.nextActions.length).toBeLessThanOrEqual(3);
  });
});

describe("CareerPilotFeedback", () => {
  it("renders unchecked consent and disabled submit affordance by default", () => {
    const html = renderToStaticMarkup(
      <CareerPilotFeedback onSubmit={async () => ({ ok: true })} />,
    );

    expect(html).toContain("Autorizo o registro deste feedback");
    expect(html).not.toContain("checked=");
    expect(html).toContain("Enviar feedback");
    expect(html).toContain("Seu feedback é opcional");
    expect(html).toContain("Esta análise ajudou você a entender o próximo passo?");
  });
});

export function canSubmitPilotFeedback(input: {
  consentChecked: boolean;
  rating: "helpful" | "partially_helpful" | "not_helpful" | null;
  isSubmitting: boolean;
}): boolean {
  return input.consentChecked && input.rating != null && !input.isSubmitting;
}

describe("canSubmitPilotFeedback", () => {
  it("blocks submission without consent", () => {
    expect(
      canSubmitPilotFeedback({
        consentChecked: false,
        rating: "helpful",
        isSubmitting: false,
      }),
    ).toBe(false);
  });

  it("allows submission only with consent and rating", () => {
    expect(
      canSubmitPilotFeedback({
        consentChecked: true,
        rating: "helpful",
        isSubmitting: false,
      }),
    ).toBe(true);
  });
});
