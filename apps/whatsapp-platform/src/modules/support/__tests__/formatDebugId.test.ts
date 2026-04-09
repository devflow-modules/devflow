import { describe, it, expect } from "vitest";
import { formatDebugIdForUi } from "../formatDebugId";

describe("formatDebugIdForUi", () => {
  it("formata UUID para XXXX-XXXX", () => {
    expect(formatDebugIdForUi("550e8400-e29b-41d4-a716-446655440000")).toBe("550E-8400");
  });
});
