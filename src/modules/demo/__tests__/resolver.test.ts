import { describe, it, expect } from "vitest";
import { isHandoffIntent, DEMO_SCENARIOS } from "../scenarios";
import {
  getScenarioIntro,
  resolveDemoUserMessage,
  buildOpsAfterUserMessage,
  getInitialOpsState,
  applyHandoffQueueVisual,
} from "../resolver";

describe("isHandoffIntent", () => {
  it("detecta pedido de atendente humano", () => {
    expect(isHandoffIntent("Quero falar com um atendente")).toBe(true);
    expect(isHandoffIntent("preciso falar com o balcão")).toBe(true);
    expect(isHandoffIntent("Quero falar com o balcao")).toBe(true);
  });

  it("não dispara em perguntas comuns", () => {
    expect(isHandoffIntent("Tem essência de morango?")).toBe(false);
    expect(isHandoffIntent("Qual o horário?")).toBe(false);
  });
});

describe("getScenarioIntro", () => {
  it("retorna intro para cada cenário", () => {
    expect(getScenarioIntro("restaurante")).toContain("restaurante");
    expect(getScenarioIntro("tabacaria")).toContain("tabacaria");
    expect(getScenarioIntro("loja")).toContain("loja");
  });

  it("cada cenário tem 3 atalhos sugeridos", () => {
    for (const id of ["restaurante", "tabacaria", "loja"] as const) {
      expect(DEMO_SCENARIOS[id].suggestedPrompts.length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("resolveDemoUserMessage", () => {
  const baseOps = getInitialOpsState("restaurante");

  it("retorna handoff para intenção explícita", () => {
    const ops = buildOpsAfterUserMessage("restaurante", "oi", baseOps);
    const r = resolveDemoUserMessage("restaurante", "Quero falar com um atendente", ops);
    expect(r.kind).toBe("handoff");
    expect(r.opsPatch?.status).toBe("aguardando_humano");
  });

  it("responde por keyword no nicho", () => {
    const tabOps = getInitialOpsState("tabacaria");
    const ops = buildOpsAfterUserMessage("tabacaria", "Tem morango?", tabOps);
    const r = resolveDemoUserMessage("tabacaria", "Tem essência de morango?", ops);
    expect(r.kind).toBe("text");
    expect(r.botText.toLowerCase()).toContain("morango");
  });

  it("applyHandoffQueueVisual move para na_fila", () => {
    const o = applyHandoffQueueVisual({
      ...baseOps,
      status: "aguardando_humano",
      threadPreview: "x",
      queueHint: "q",
    });
    expect(o.status).toBe("na_fila");
  });
});
