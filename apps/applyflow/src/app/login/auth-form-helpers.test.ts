import { describe, expect, it } from "vitest";

import {
  AUTH_CONFIRM_EMAIL_MESSAGE,
  mapAuthFormError,
  resolveSignUpOutcome,
} from "./auth-form-helpers";

describe("login/signup surface helpers", () => {
  it("maps confirm-email vs session outcomes", () => {
    expect(resolveSignUpOutcome(false)).toBe("confirm_email");
    expect(resolveSignUpOutcome(true)).toBe("session");
    expect(AUTH_CONFIRM_EMAIL_MESSAGE).toBe(
      "Check your email to confirm your account.",
    );
  });

  it("maps empty auth errors to a safe message", () => {
    expect(mapAuthFormError(undefined)).toBe("Authentication failed. Try again.");
    expect(mapAuthFormError("Invalid login credentials")).toBe(
      "Invalid login credentials",
    );
  });
});
