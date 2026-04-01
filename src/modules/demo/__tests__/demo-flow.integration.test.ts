import { describe, it, expect } from "vitest";
import {
  applyHandoffQueueVisual,
  buildOpsAfterUserMessage,
  getInitialOpsState,
  getScenarioIntro,
  resolveDemoUserMessage,
} from "../resolver";

/**
 * Fluxo principal da demo (sem UI): intro → mensagem com keyword → handoff → fila visual.
 */
describe("demo flow integration", () => {
  it("tabacaria: intro existe, keyword morango, handoff e na_fila", () => {
    expect(getScenarioIntro("tabacaria").toLowerCase()).toContain("tabacaria");

    let ops = getInitialOpsState("tabacaria");
    ops = {
      ...ops,
      threadPreview: "Canal aberto — Tabacaria (simulação)",
      queueHint: "Aguardando a primeira mensagem do cliente",
    };

    const user1 = "Tem essência de morango?";
    const after1 = buildOpsAfterUserMessage("tabacaria", user1, ops);
    const reply1 = resolveDemoUserMessage("tabacaria", user1, after1);
    expect(reply1.kind).toBe("text");
    expect(reply1.botText.toLowerCase()).toContain("morango");

    const merged1 = { ...after1, ...reply1.opsPatch };
    const user2 = "Quero falar com o balcão";
    const after2 = buildOpsAfterUserMessage("tabacaria", user2, merged1);
    const reply2 = resolveDemoUserMessage("tabacaria", user2, after2);
    expect(reply2.kind).toBe("handoff");
    expect(reply2.opsPatch?.status).toBe("aguardando_humano");

    const afterHandoff = { ...after2, ...reply2.opsPatch } as typeof after2;
    const queued = applyHandoffQueueVisual(afterHandoff);
    expect(queued.status).toBe("na_fila");
    expect(queued.queueHint).toContain("Posição");
  });

  it("loja: fluxo mínimo até defaultReply", () => {
    let ops = getInitialOpsState("loja");
    ops = { ...ops, threadPreview: "Sessão", queueHint: "ok" };
    const user = "Mensagem genérica sem keyword conhecida xyz123";
    const after = buildOpsAfterUserMessage("loja", user, ops);
    const reply = resolveDemoUserMessage("loja", user, after);
    expect(reply.kind).toBe("text");
    expect(reply.botText.length).toBeGreaterThan(20);
  });
});
