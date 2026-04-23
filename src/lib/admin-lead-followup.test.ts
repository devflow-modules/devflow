import { describe, it, expect } from "vitest";
import {
  buildPrismaWhereForFollowupFilter,
  deriveFollowupUrgency,
  isStaleContact,
} from "./admin-lead-followup";

describe("admin-lead-followup", () => {
  it("deriveFollowupUrgency: hoje", () => {
    const now = new Date(2025, 3, 15, 14, 0, 0);
    const sameDay = new Date(2025, 3, 15, 9, 0, 0).toISOString();
    expect(deriveFollowupUrgency(sameDay, now)).toBe("due_today");
  });

  it("deriveFollowupUrgency: atrasado", () => {
    const now = new Date(2025, 3, 15, 12, 0, 0);
    const y = new Date(2025, 3, 14, 20, 0, 0).toISOString();
    expect(deriveFollowupUrgency(y, now)).toBe("overdue");
  });

  it("isStaleContact em meio de funil sem contato", () => {
    expect(isStaleContact("respondeu", null, new Date())).toBe(true);
  });

  it("buildPrismaWhereForFollowupFilter none", () => {
    expect(buildPrismaWhereForFollowupFilter("none")).toEqual({ nextFollowUpAt: null });
  });
});
