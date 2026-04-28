import { describe, it, expect, vi, afterEach } from "vitest";
import {
  computeProspectScore,
  mergeProspectData,
  parseProspectFromUnknown,
  prospectBadges,
  isFollowUpDueOrOverdue,
  normalizeSalesStage,
} from "../prospectSales";

describe("parseProspectFromUnknown", () => {
  it("ignora JSON inválido", () => {
    expect(parseProspectFromUnknown(null)).toBeUndefined();
    expect(parseProspectFromUnknown("x")).toBeUndefined();
  });

  it("parseia campos e enum source", () => {
    const p = parseProspectFromUnknown({
      companyName: "  ACME  ",
      source: "instagram",
      salesStage: "PROPOSAL_SENT",
      attendantsCount: "3",
      proposalValue: 12_500.5,
      nextFollowUpAt: "2026-04-28T10:00:00.000Z",
    });
    expect(p?.companyName).toBe("ACME");
    expect(p?.source).toBe("instagram");
    expect(p?.salesStage).toBe("PROPOSAL_SENT");
    expect(p?.attendantsCount).toBe("3");
    expect(p?.proposalValue).toBe(12_500.5);
  });

  it("ignora source inválido", () => {
    const p = parseProspectFromUnknown({ source: "facebook" });
    expect(p).toBeUndefined();
  });

  it("normaliza estágio legado NEW_PROSPECT → NEW", () => {
    expect(normalizeSalesStage("NEW_PROSPECT")).toBe("NEW");
    const p = parseProspectFromUnknown({ salesStage: "NEW_PROSPECT" });
    expect(p?.salesStage).toBe("NEW");
  });

  it("proposalValue a partir de string numérica", () => {
    const p = parseProspectFromUnknown({ proposalValue: "25000" });
    expect(p?.proposalValue).toBe(25_000);
  });
});

describe("mergeProspectData", () => {
  it("sobrescreve strings, estágio e número", () => {
    const a = mergeProspectData(
      { companyName: "A", salesStage: "NEW", proposalValue: 100 },
      { companyName: "B", salesStage: "CONTACTED", proposalValue: 200 }
    );
    expect(a.companyName).toBe("B");
    expect(a.salesStage).toBe("CONTACTED");
    expect(a.proposalValue).toBe(200);
  });

  it("remove campo string com string vazia", () => {
    const a = mergeProspectData({ pain: "x" }, { pain: "" });
    expect(a.pain).toBeUndefined();
  });
});

describe("computeProspectScore", () => {
  it("usa attendantsCount string para >1", () => {
    const s = computeProspectScore(
      {
        estimatedVolume: "recebemos leads todo o dia e tráfego pago",
        attendantsCount: "2",
        pain: "perdemos cliente por demora",
      },
      "whatsapp é o canal principal"
    );
    expect(s).toBeGreaterThanOrEqual(30 + 25 + 20 + 15 + 10);
  });

  it("aplica penalizações", () => {
    const s = computeProspectScore(
      {
        pain: "sou autônomo e trabalho sozinho, só queria testar a ferramenta",
      },
      ""
    );
    expect(s).toBeLessThanOrEqual(-20);
  });
});

describe("prospectBadges", () => {
  it("marca follow-up atraso ou hoje em vermelho", () => {
    const b = prospectBadges({
      prospect: { nextFollowUpAt: "2020-01-01T12:00:00.000Z" },
    });
    expect(b.some((x) => x.id === "fu-due")).toBe(true);
  });
});

describe("isFollowUpDueOrOverdue", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("retorna false para entrada vazia ou inválida", () => {
    expect(isFollowUpDueOrOverdue(undefined)).toBe(false);
    expect(isFollowUpDueOrOverdue("")).toBe(false);
    expect(isFollowUpDueOrOverdue("não-é-data")).toBe(false);
  });

  it("compara com fim do dia civil local (relógio fixo)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 28, 15, 0, 0));
    expect(isFollowUpDueOrOverdue(new Date(2026, 3, 28, 8, 0, 0).toISOString())).toBe(true);
    expect(isFollowUpDueOrOverdue(new Date(2026, 3, 29, 0, 0, 1).toISOString())).toBe(false);
  });
});
