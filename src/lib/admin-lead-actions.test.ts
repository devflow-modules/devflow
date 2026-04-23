import { describe, it, expect } from "vitest";
import {
  getLeadActionState,
  getSuggestedAction,
  getTodayActionList,
  pickActionListWithState,
} from "./admin-lead-actions";

const fixedNow = new Date("2026-06-15T12:00:00.000Z");

describe("getLeadActionState", () => {
  it("estágios finais: sem tarefa", () => {
    const s = getLeadActionState({ status: "fechado", lastContactAt: null }, fixedNow);
    expect(s.needsFollowUp).toBe(false);
  });

  it("nunca contatado: prioridade alta", () => {
    const s = getLeadActionState({ status: "novo", lastContactAt: null }, fixedNow);
    expect(s.needsFollowUp).toBe(true);
    expect(s.reason).toBe("Nunca contatado");
    expect(s.urgency).toBe("high");
  });

  it("demo enviada: abaixo de 2 dias — em dia", () => {
    const last = new Date("2026-06-14T10:00:00.000Z");
    const s = getLeadActionState({ status: "demo_enviada", lastContactAt: last }, fixedNow);
    expect(s.needsFollowUp).toBe(false);
  });

  it("demo enviada: exatamente no limite 2d — follow-up, urgência baixa", () => {
    const last = new Date("2026-06-13T12:00:00.000Z");
    const s = getLeadActionState({ status: "demo_enviada", lastContactAt: last }, fixedNow);
    expect(s.needsFollowUp).toBe(true);
    expect(s.urgency).toBe("low");
  });

  it("respondeu: requer 1 dia", () => {
    const last = new Date("2026-06-14T00:00:00.000Z");
    const s = getLeadActionState({ status: "respondeu", lastContactAt: last }, fixedNow);
    expect(s.needsFollowUp).toBe(true);
  });

  it("contato_iniciado: requer 2 dias", () => {
    const last = new Date("2026-06-10T00:00:00.000Z");
    const s = getLeadActionState({ status: "contato_iniciado", lastContactAt: last }, fixedNow);
    expect(s.needsFollowUp).toBe(true);
    expect(s.urgency).toBe("high");
  });
});

describe("getSuggestedAction", () => {
  it("estados mapeados", () => {
    expect(getSuggestedAction({ status: "novo", lastContactAt: null }).label).toBe("Iniciar contato");
    expect(getSuggestedAction({ status: "respondeu", lastContactAt: new Date() }).label).toBe("Enviar demo");
    expect(getSuggestedAction({ status: "fechado", lastContactAt: new Date() }).type).toBe("none");
    expect(getSuggestedAction({ status: "perdido", lastContactAt: new Date() }).label).toContain("Reengajar");
  });
});

describe("getTodayActionList", () => {
  it("filtra e ordena sem crash com datas nulas", () => {
    const list = getTodayActionList(
      [
        { status: "novo", lastContactAt: null, name: "B" },
        { status: "novo", lastContactAt: null, name: "A" },
      ],
      fixedNow
    );
    expect(list).toHaveLength(2);
    expect(list[0]!.name).toBe("A");
  });
});

describe("pickActionListWithState", () => {
  it("reutiliza estados pré-calculados", () => {
    const a = {
      id: "1",
      status: "novo",
      lastContactAt: null,
      name: "Z",
      leadActionState: { needsFollowUp: true, urgency: "high" as const, reason: "Nunca contatado" },
    };
    const b = {
      id: "2",
      status: "respondeu",
      lastContactAt: new Date("2026-01-01"),
      name: "A",
      leadActionState: { needsFollowUp: true, urgency: "low" as const, reason: "X" },
    };
    const out = pickActionListWithState([a, b]);
    expect(out[0]!.id).toBe("1");
    expect(out[1]!.id).toBe("2");
  });
});
