import { describe, it, expect } from "vitest";
import { formatDisplayLine, statusLabel } from "../whatsappConnectUtils";
import type { WhatsappPhoneNumberRow } from "../whatsappConnectTypes";

const base = (over: Partial<WhatsappPhoneNumberRow>): WhatsappPhoneNumberRow => ({
  id: "id1",
  phoneNumberId: "pn123",
  displayPhoneNumber: null,
  wabaId: null,
  status: "ACTIVE",
  isPrimary: false,
  isDefaultOutbound: false,
  label: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

describe("whatsappConnectUtils", () => {
  it("formatDisplayLine usa telefone quando existe", () => {
    expect(formatDisplayLine(base({ displayPhoneNumber: "+351 910 000 000" }))).toBe("+351 910 000 000");
  });

  it("formatDisplayLine cai no phoneNumberId sem display", () => {
    expect(formatDisplayLine(base({ displayPhoneNumber: null }))).toBe("pn123");
  });

  it("statusLabel traduz ACTIVE", () => {
    expect(statusLabel("ACTIVE")).toBe("Ativo");
  });

  it("statusLabel suaviza outros códigos", () => {
    expect(statusLabel("PENDING_REVIEW")).toBe("PENDING REVIEW");
  });
});
