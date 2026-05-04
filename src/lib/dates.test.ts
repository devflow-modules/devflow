import { describe, it, expect } from "vitest";
import {
  assertDateOnly,
  dateOnlyToUTC,
  formatDateOnlyPtBr,
  toDateOnly,
} from "./dates";

describe("dates", () => {
  it("toDateOnly usa componentes UTC para Date e normaliza ISO para YYYY-MM-DD", () => {
    expect(toDateOnly(new Date(Date.UTC(2026, 0, 5, 15, 30, 0)))).toBe("2026-01-05");
    expect(toDateOnly("2026-01-05")).toBe("2026-01-05");
    expect(toDateOnly("2026-01-05T12:00:00.000Z")).toBe("2026-01-05");
  });

  it("formatDateOnlyPtBr formata em DD/MM/YYYY e dateOnlyToUTC rejeita formato que não é date-only", () => {
    expect(formatDateOnlyPtBr("2026-01-05")).toBe("05/01/2026");
    expect(assertDateOnly("2026-1-05")).toBe(false);
    expect(() => dateOnlyToUTC("2026-1-05")).toThrow(/YYYY-MM-DD/);
  });
});
