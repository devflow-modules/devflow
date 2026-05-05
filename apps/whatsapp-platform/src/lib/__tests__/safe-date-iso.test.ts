import { describe, it, expect } from "vitest";
import { safeDateToIsoString } from "../safe-date-iso";

describe("safeDateToIsoString", () => {
  it("null e undefined → null", () => {
    expect(safeDateToIsoString(null)).toBeNull();
    expect(safeDateToIsoString(undefined)).toBeNull();
  });

  it("data válida → ISO", () => {
    const d = new Date("2026-05-01T12:00:00.000Z");
    expect(safeDateToIsoString(d)).toBe("2026-05-01T12:00:00.000Z");
  });

  it("data inválida → null", () => {
    expect(safeDateToIsoString(new Date(Number.NaN))).toBeNull();
  });
});
