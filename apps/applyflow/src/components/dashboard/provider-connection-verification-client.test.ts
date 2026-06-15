import { describe, expect, it } from "vitest";
import {
  formatLocalConnectionFlowLabel,
  formatServerVerificationLabel,
  shouldShowVerifyConnectionButton,
} from "./provider-connection-verification-client";
import { createProviderConnectionVerificationResult } from "@devflow/career-sync";

describe("provider-connection-verification-client", () => {
  it("shows verify button only after local connected state with consent", () => {
    expect(
      shouldShowVerifyConnectionButton({
        explicitConsentChecked: true,
        localConnectionState: "connected",
        isVerifying: false,
      }),
    ).toBe(true);

    expect(
      shouldShowVerifyConnectionButton({
        explicitConsentChecked: false,
        localConnectionState: "connected",
        isVerifying: false,
      }),
    ).toBe(false);

    expect(
      shouldShowVerifyConnectionButton({
        explicitConsentChecked: true,
        localConnectionState: "connecting",
        isVerifying: false,
      }),
    ).toBe(false);
  });

  it("formats local and server labels separately", () => {
    expect(formatLocalConnectionFlowLabel("connected")).toBe("completed");
    expect(formatServerVerificationLabel(null, false)).toBe("not checked");
    expect(formatServerVerificationLabel(null, true)).toBe("verification_pending");

    const verified = createProviderConnectionVerificationResult({
      provider: "gmail",
      runtime: "nango",
      state: "connected",
      checkedAt: "2026-06-12T12:00:00.000Z",
    });

    expect(formatServerVerificationLabel(verified, false)).toBe("connected");
  });
});
