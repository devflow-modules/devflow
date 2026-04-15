import { describe, it, expect } from "vitest";
import type { WhatsappPhoneNumber } from "@/generated/prisma-whatsapp";
import { WhatsappPhoneNumberStatus } from "@/generated/prisma-whatsapp";
import {
  assertWhatsappPhoneNumberSendable,
  isWhatsappLineReadyForOutbound,
} from "../whatsappChannelGuards";

describe("whatsappChannelGuards", () => {
  it("isWhatsappLineReadyForOutbound: só ACTIVE com token", () => {
    expect(
      isWhatsappLineReadyForOutbound({
        status: WhatsappPhoneNumberStatus.PENDING_ACTIVATION,
        accessToken: null,
      })
    ).toBe(false);
    expect(
      isWhatsappLineReadyForOutbound({
        status: WhatsappPhoneNumberStatus.ACTIVE,
        accessToken: "  ",
      })
    ).toBe(false);
    expect(
      isWhatsappLineReadyForOutbound({
        status: WhatsappPhoneNumberStatus.ACTIVE,
        accessToken: "EAAG",
      })
    ).toBe(true);
  });

  it("assertWhatsappPhoneNumberSendable: CHANNEL_NOT_ACTIVE", () => {
    expect(() =>
      assertWhatsappPhoneNumberSendable({
        status: WhatsappPhoneNumberStatus.PENDING_ACTIVATION,
        accessToken: null,
      } as WhatsappPhoneNumber)
    ).toThrowError("CHANNEL_NOT_ACTIVE");
  });
});
