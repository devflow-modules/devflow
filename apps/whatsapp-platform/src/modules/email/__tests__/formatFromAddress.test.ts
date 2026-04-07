import { describe, expect, it } from "vitest";
import { formatResendFromAddress } from "../utils/formatFromAddress";

describe("formatResendFromAddress", () => {
  it("envolve e-mail simples com nome a partir de RESEND_FROM_NAME", () => {
    process.env.RESEND_FROM_NAME = "DevFlow Labs";
    expect(formatResendFromAddress("noreply@whatsapp.devflowlabs.com.br")).toBe(
      "DevFlow Labs <noreply@whatsapp.devflowlabs.com.br>"
    );
  });

  it("usa default DevFlow quando RESEND_FROM_NAME vazio", () => {
    delete process.env.RESEND_FROM_NAME;
    expect(formatResendFromAddress("noreply@whatsapp.devflowlabs.com.br")).toBe(
      "DevFlow <noreply@whatsapp.devflowlabs.com.br>"
    );
  });

  it("mantém formato Nome <email>", () => {
    expect(formatResendFromAddress("DevFlow Labs <noreply@whatsapp.devflowlabs.com.br>")).toBe(
      "DevFlow Labs <noreply@whatsapp.devflowlabs.com.br>"
    );
  });

  it("remove aspas externas do e-mail", () => {
    delete process.env.RESEND_FROM_NAME;
    process.env.RESEND_FROM_NAME = "WhatsApp Platform";
    expect(formatResendFromAddress('"noreply@x.com"')).toBe("WhatsApp Platform <noreply@x.com>");
  });
});
