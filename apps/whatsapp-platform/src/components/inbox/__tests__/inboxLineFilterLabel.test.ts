import { describe, it, expect } from "vitest";
import type { WhatsappLineSummary } from "../inboxTypes";
import { formatInboxLineFilterOptionLabel } from "../inboxLineFilterLabel";

function line(partial: Partial<WhatsappLineSummary>): WhatsappLineSummary {
  return {
    phoneNumberId: "pn1",
    label: null,
    displayPhoneNumber: null,
    isPrimary: false,
    isDefaultOutbound: false,
    status: "ACTIVE",
    purpose: "GENERAL",
    ...partial,
  };
}

describe("formatInboxLineFilterOptionLabel", () => {
  it("junta label, telefone e finalidade", () => {
    const s = formatInboxLineFilterOptionLabel(
      line({
        label: "Canal vendas",
        displayPhoneNumber: "+55 13 99188-6087",
        purpose: "PROSPECTING",
      })
    );
    expect(s).toContain("Canal vendas");
    expect(s).toContain("+55 13 99188-6087");
    expect(s).toContain("Prospecção");
  });

  it("usa id curto quando não há nome nem telefone", () => {
    expect(formatInboxLineFilterOptionLabel(line({ phoneNumberId: "short-id-here" }))).toContain("short-id-here");
  });

  it("marca principal e envio padrão", () => {
    const s = formatInboxLineFilterOptionLabel(
      line({
        label: "Principal",
        purpose: "SUPPORT",
        isPrimary: true,
        isDefaultOutbound: true,
      })
    );
    expect(s).toContain("Principal");
    expect(s).toContain("Suporte");
  });
});
