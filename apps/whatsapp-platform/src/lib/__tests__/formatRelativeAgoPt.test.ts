import { describe, expect, it } from "vitest";
import { formatRelativeAgoPt } from "../formatRelativeAgoPt";

describe("formatRelativeAgoPt", () => {
  it("retorna — para ausente", () => {
    expect(formatRelativeAgoPt(null)).toBe("—");
    expect(formatRelativeAgoPt(undefined)).toBe("—");
  });

  it("formata instantes recentes", () => {
    const iso = new Date(Date.now() - 30_000).toISOString();
    expect(formatRelativeAgoPt(iso)).toBe("há segundos");
  });
});
