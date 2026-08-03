import { describe, expect, it } from "vitest";
import { isWhatsappLineReadyForOutbound } from "../whatsappChannelGuards";
import { WhatsappPhoneNumberStatus } from "@/generated/prisma-whatsapp";

describe("isWhatsappLineReadyForOutbound", () => {
  it("false quando inactive", () => {
    expect(
      isWhatsappLineReadyForOutbound({
        status: WhatsappPhoneNumberStatus.PENDING_ACTIVATION,
        accessTokenEncrypted: null,
      })
    ).toBe(false);
  });

  it("false quando ACTIVE sem encrypted", () => {
    expect(
      isWhatsappLineReadyForOutbound({
        status: WhatsappPhoneNumberStatus.ACTIVE,
        accessTokenEncrypted: "  ",
      })
    ).toBe(false);
  });

  it("true quando ACTIVE com encrypted", () => {
    expect(
      isWhatsappLineReadyForOutbound({
        status: WhatsappPhoneNumberStatus.ACTIVE,
        accessTokenEncrypted: "dfwa1.k.a.b.c",
      })
    ).toBe(true);
  });

  it("false quando ACTIVE só com campo ausente", () => {
    expect(
      isWhatsappLineReadyForOutbound({
        status: WhatsappPhoneNumberStatus.ACTIVE,
      })
    ).toBe(false);
  });
});
