import { describe, it, expect } from "vitest";
import { WhatsappPhoneNumberStatus } from "@/generated/prisma-whatsapp";
import {
  computePriorityScore,
  computeSlaStatus,
  differenceInMinutesSafe,
  matchesPendingFilter,
  type PendingChannelRow,
} from "../channelActivationService";

function row(partial: Partial<PendingChannelRow> & Pick<PendingChannelRow, "slaStatus" | "possiblyStuck" | "minutesInQueue">): PendingChannelRow {
  return {
    id: "x",
    tenantId: "t",
    phoneNumber: "+1",
    phoneNumberId: "pn",
    tenantName: "T",
    status: WhatsappPhoneNumberStatus.PENDING_ACTIVATION,
    createdAt: "2026-04-14T12:00:00.000Z",
    updatedAt: "2026-04-14T12:00:00.000Z",
    activatedAt: null,
    priorityScore: 0,
    autoHealAttempts: 0,
    lastAutoHealAt: null,
    autoHealStatus: "DISABLED",
    ...partial,
  };
}

describe("channelActivationService", () => {
  it("differenceInMinutesSafe nunca negativo", () => {
    const a = new Date("2026-04-14T12:00:00Z");
    const b = new Date("2026-04-14T12:10:00Z");
    expect(differenceInMinutesSafe(a, b)).toBe(0);
    expect(differenceInMinutesSafe(b, a)).toBe(10);
  });

  it("computeSlaStatus: ok < 5 min", () => {
    const created = new Date("2026-04-14T12:00:00Z");
    const now = new Date("2026-04-14T12:04:00Z");
    expect(computeSlaStatus(created, now)).toEqual({ minutesInQueue: 4, slaStatus: "ok" });
  });

  it("computeSlaStatus: delay 5–30 min", () => {
    const created = new Date("2026-04-14T12:00:00Z");
    const now = new Date("2026-04-14T12:15:00Z");
    expect(computeSlaStatus(created, now)).toEqual({ minutesInQueue: 15, slaStatus: "delay" });
  });

  it("computeSlaStatus: delay no limite 30 min", () => {
    const created = new Date("2026-04-14T12:00:00Z");
    const now = new Date("2026-04-14T12:30:00Z");
    expect(computeSlaStatus(created, now)).toEqual({ minutesInQueue: 30, slaStatus: "delay" });
  });

  it("computeSlaStatus: critical > 30 min", () => {
    const created = new Date("2026-04-14T12:00:00Z");
    const now = new Date("2026-04-14T12:31:00Z");
    expect(computeSlaStatus(created, now)).toEqual({ minutesInQueue: 31, slaStatus: "critical" });
  });

  it("computePriorityScore: crítico > delay com mesmos minutos", () => {
    const base = { minutesInQueue: 20, possiblyStuck: false };
    expect(computePriorityScore({ ...base, slaStatus: "critical" })).toBeGreaterThan(
      computePriorityScore({ ...base, slaStatus: "delay" })
    );
  });

  it("matchesPendingFilter: possibly_stuck só linhas travadas", () => {
    const stuck = row({ slaStatus: "ok", possiblyStuck: true, minutesInQueue: 1 });
    const notStuck = row({ slaStatus: "critical", possiblyStuck: false, minutesInQueue: 40 });
    expect(matchesPendingFilter(stuck, "possibly_stuck")).toBe(true);
    expect(matchesPendingFilter(notStuck, "possibly_stuck")).toBe(false);
  });

  it("matchesPendingFilter: critical só SLA critical", () => {
    const c = row({ slaStatus: "critical", possiblyStuck: false, minutesInQueue: 40 });
    const d = row({ slaStatus: "delay", possiblyStuck: false, minutesInQueue: 10 });
    expect(matchesPendingFilter(c, "critical")).toBe(true);
    expect(matchesPendingFilter(d, "critical")).toBe(false);
  });
});
