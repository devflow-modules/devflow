import { describe, it, expect } from "vitest";
import {
  formatWhatsappLineBadgeLabel,
  formatWhatsappLineFilterOptionLabel,
  getWhatsappLinePurposeLabel,
  getWhatsappLinePurposeTone,
  isPrimaryWhatsappLine,
} from "../linePresentation";

function line(
  over: Partial<import("../linePresentation").WhatsappLinePresentationInput> = {}
): import("../linePresentation").WhatsappLinePresentationInput {
  return {
    phoneNumberId: "pn-default",
    label: null,
    displayPhoneNumber: null,
    isPrimary: false,
    isDefaultOutbound: false,
    purpose: "GENERAL",
    ...over,
  };
}

describe("isPrimaryWhatsappLine", () => {
  it("identifica linha principal", () => {
    expect(isPrimaryWhatsappLine(line({ isPrimary: true }))).toBe(true);
    expect(isPrimaryWhatsappLine(line({ isPrimary: false }))).toBe(false);
  });
});

describe("getWhatsappLinePurposeLabel", () => {
  it("traduz finalidades conhecidas", () => {
    expect(getWhatsappLinePurposeLabel(line({ purpose: "PROSPECTING" }))).toBe("Prospecção");
    expect(getWhatsappLinePurposeLabel(line({ purpose: "SALES" }))).toBe("Vendas");
    expect(getWhatsappLinePurposeLabel(line({ purpose: "SUPPORT" }))).toBe("Suporte");
    expect(getWhatsappLinePurposeLabel(line({ purpose: "FINANCE" }))).toBe("Financeiro");
    expect(getWhatsappLinePurposeLabel(line({ purpose: "GENERAL" }))).toBe("Geral");
  });

  it("usa fallback para finalidade desconhecida", () => {
    expect(getWhatsappLinePurposeLabel(line({ purpose: "CUSTOM_X" }))).toBe("CUSTOM_X");
  });

  it("usa fallback amigável sem purpose", () => {
    expect(getWhatsappLinePurposeLabel(line({ purpose: "" }))).toBe("Linha operacional");
  });
});

describe("getWhatsappLinePurposeTone", () => {
  it("linha principal usa tom brand", () => {
    const { className } = getWhatsappLinePurposeTone(line({ isPrimary: true, purpose: "GENERAL" }));
    expect(className).toContain("df-badge-brand");
  });

  it("prospecção usa tom distinto", () => {
    const { className } = getWhatsappLinePurposeTone(line({ isPrimary: false, purpose: "PROSPECTING" }));
    expect(className).toContain("df-badge-admin");
  });

  it("vendas, suporte e financeiro têm tons dedicados", () => {
    expect(getWhatsappLinePurposeTone(line({ purpose: "SALES" })).className).toContain("df-badge-success");
    expect(getWhatsappLinePurposeTone(line({ purpose: "SUPPORT" })).className).toContain("df-badge-info");
    expect(getWhatsappLinePurposeTone(line({ purpose: "FINANCE" })).className).toContain("df-badge-warning");
  });

  it("Geral não principal usa muted", () => {
    expect(getWhatsappLinePurposeTone(line({ isPrimary: false, purpose: "GENERAL" })).className).toContain(
      "df-badge-muted"
    );
  });
});

describe("formatWhatsappLineBadgeLabel", () => {
  it("principal mostra Principal", () => {
    expect(formatWhatsappLineBadgeLabel(line({ isPrimary: true, purpose: "GENERAL" }))).toBe("Principal");
  });

  it("prospecção sem label mostra Prospecção", () => {
    expect(formatWhatsappLineBadgeLabel(line({ isPrimary: false, purpose: "PROSPECTING", label: null }))).toBe(
      "Prospecção"
    );
  });

  it("linha com nome interno prioriza o nome", () => {
    expect(
      formatWhatsappLineBadgeLabel(
        line({ isPrimary: false, purpose: "GENERAL", label: "Campanha Verão 2026", displayPhoneNumber: null })
      )
    ).toBe("Campanha Verão 2026");
  });

  it("sem label nem finalidade específica cai no telefone ou id", () => {
    expect(
      formatWhatsappLineBadgeLabel(
        line({
          isPrimary: false,
          purpose: "GENERAL",
          label: null,
          displayPhoneNumber: "+351 999 999 999",
        })
      )
    ).toBe("+351 999 999 999");
  });
});

describe("formatWhatsappLineFilterOptionLabel", () => {
  it("compõe rótulo longo com principal e envio padrão", () => {
    const s = formatWhatsappLineFilterOptionLabel(
      line({
        phoneNumberId: "pn-1",
        label: "Principal",
        displayPhoneNumber: "+351 910 000 000",
        isPrimary: true,
        isDefaultOutbound: true,
        purpose: "GENERAL",
      })
    );
    expect(s).toContain("Principal");
    expect(s).toContain("Geral");
    expect(s).toContain("Envio padrão");
  });
});
