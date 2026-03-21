import { describe, it, expect } from "vitest";
import {
  isCloudApiRegistered,
  isCodeVerifiedOnMeta,
  isRegisterAlreadySatisfiedError,
} from "../whatsappOnboarding.registration";

describe("registration heuristics", () => {
  it("CLOUD_API", () => {
    expect(isCloudApiRegistered({ id: "x", platform_type: "CLOUD_API" })).toBe(true);
    expect(isCloudApiRegistered({ id: "x", platform_type: "NOT_APPLICABLE" })).toBe(false);
  });

  it("VERIFIED", () => {
    expect(isCodeVerifiedOnMeta({ id: "x", code_verification_status: "VERIFIED" })).toBe(
      true
    );
  });

  it("already registered", () => {
    expect(
      isRegisterAlreadySatisfiedError(new Error("already registered"))
    ).toBe(true);
    expect(
      isRegisterAlreadySatisfiedError(new Error("x"), {
        code: "ALREADY_REGISTERED",
        httpStatus: 409,
        message: "",
      })
    ).toBe(true);
  });
});
