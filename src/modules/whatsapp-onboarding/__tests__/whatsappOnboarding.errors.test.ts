import { describe, it, expect } from "vitest";
import { mapMetaError } from "../whatsappOnboarding.errors";

describe("mapMetaError", () => {
  it("mapeia token inválido", () => {
    const m = mapMetaError(400, { error: { message: "OAuth", code: 190 } });
    expect(m.code).toBe("TOKEN_INVALID_OR_EXPIRED");
  });

  it("mapeia verify code 136025", () => {
    const m = mapMetaError(400, { error: { message: "x", code: 136025 } });
    expect(m.code).toBe("VERIFY_CODE_FAILED");
  });

  it("mapeia request code 136024", () => {
    const m = mapMetaError(400, { error: { message: "x", code: 136024 } });
    expect(m.code).toBe("REQUEST_CODE_FAILED");
  });
});
