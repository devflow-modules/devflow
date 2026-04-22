import { describe, it, expect } from "vitest";
import { sortOutboundLeadsByCommercialPriority } from "./admin-outbound-leads";

describe("sortOutboundLeadsByCommercialPriority", () => {
  it("ordena por prioridade comercial e depois updatedAt", () => {
    const a = {
      id: "a",
      status: "novo",
      updatedAt: new Date("2025-01-01"),
    };
    const b = {
      id: "b",
      status: "negociacao",
      updatedAt: new Date("2020-01-01"),
    };
    const c = {
      id: "c",
      status: "novo",
      updatedAt: new Date("2025-06-01"),
    };
    const out = sortOutboundLeadsByCommercialPriority([a, b, c]);
    expect(out.map((x) => x.id)).toEqual(["b", "c", "a"]);
  });
});
