import { describe, it, expect } from "vitest";
import { getImplantationCommissionBlockState, REASON_AGUARDANDO_SINCRONIZACAO } from "../commissionUiState";

describe("getImplantationCommissionBlockState", () => {
  const baseTenant = {
    affiliateId: "aff1",
    implantationPriceBrl: 10_000,
    gtmLifecycle: "IMPLANTADO",
  };

  it("pendente quando existe comissão aberta", () => {
    expect(
      getImplantationCommissionBlockState(baseTenant, { id: "aff1" }, { amount: 5000, status: "pendente" })
    ).toEqual({ kind: "pendente", amount: 5000 });
  });

  it("pago quando comissão liquidada", () => {
    expect(
      getImplantationCommissionBlockState(baseTenant, { id: "aff1" }, { amount: 5000, status: "pago" })
    ).toEqual({ kind: "pago", amount: 5000 });
  });

  it("sem afiliado", () => {
    const s = getImplantationCommissionBlockState(
      { ...baseTenant, affiliateId: null },
      null,
      null
    );
    expect(s.kind).toBe("sem_geracao");
    if (s.kind === "sem_geracao") expect(s.reasonCode).toBe("NO_AFFILIATE");
  });

  it("não implantado", () => {
    const s = getImplantationCommissionBlockState(
      { ...baseTenant, gtmLifecycle: "AVALIACAO" },
      { id: "aff1" },
      null
    );
    expect(s.kind).toBe("sem_geracao");
    if (s.kind === "sem_geracao") expect(s.reasonCode).toBe("NOT_IMPLANTADO");
  });

  it("sem valor de implantação", () => {
    const s = getImplantationCommissionBlockState(
      { ...baseTenant, implantationPriceBrl: null },
      { id: "aff1" },
      null
    );
    expect(s.kind).toBe("sem_geracao");
    if (s.kind === "sem_geracao") expect(s.reasonCode).toBe("NO_IMPLANTATION_PRICE");
  });

  it("pré-requisitos ok mas sem linha ainda", () => {
    const s = getImplantationCommissionBlockState(baseTenant, { id: "aff1" }, null);
    expect(s.kind).toBe("sem_geracao");
    if (s.kind === "sem_geracao") expect(s.reasonCode).toBe(REASON_AGUARDANDO_SINCRONIZACAO);
  });
});
