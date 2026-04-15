import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  evaluateChannelAlerts,
  getChannelTimeline,
  logChannelEvent,
} from "../channelEventService";

const create = vi.fn();
const findMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    whatsappChannelEvent: {
      create: (...a: unknown[]) => create(...a),
      findMany: (...a: unknown[]) => findMany(...a),
    },
  },
}));

describe("channelEventService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("evaluateChannelAlerts", () => {
    it("critical SLA gera alerta de nível critical", () => {
      const alerts = evaluateChannelAlerts({
        slaStatus: "critical",
        possiblyStuck: false,
        minutesInQueue: 42,
        lastEvent: null,
      });
      expect(alerts.some((a) => a.level === "critical")).toBe(true);
      expect(alerts[0]?.message).toContain("42");
      expect(alerts[0]?.message).toContain("ação imediata");
    });

    it("possiblyStuck gera warning", () => {
      const alerts = evaluateChannelAlerts({
        slaStatus: "ok",
        possiblyStuck: true,
        minutesInQueue: 2,
        lastEvent: null,
      });
      expect(alerts.some((a) => a.level === "warning" && a.message.includes("travamento"))).toBe(
        true
      );
    });

    it("último evento ERROR gera alerta técnico", () => {
      const alerts = evaluateChannelAlerts({
        slaStatus: "delay",
        possiblyStuck: false,
        minutesInQueue: 10,
        lastEvent: { type: "ERROR", message: "Token inválido" },
      });
      expect(alerts.some((a) => a.message.includes("Token inválido"))).toBe(true);
    });
  });

  describe("logChannelEvent", () => {
    it("persiste create com dados normalizados", async () => {
      create.mockResolvedValue({});
      await logChannelEvent({
        channelId: "  ch1  ",
        type: "CHANNEL_CREATED",
        message: "  criado  ",
        metadata: { x: 1 },
      });
      expect(create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          channelId: "ch1",
          type: "CHANNEL_CREATED",
          message: "criado",
          metadata: { x: 1 },
        }),
      });
    });
  });

  describe("getChannelTimeline", () => {
    it("delega findMany com orderBy createdAt desc", async () => {
      const d = new Date("2026-04-14T12:00:00.000Z");
      findMany.mockResolvedValue([
        {
          id: "e2",
          channelId: "c1",
          type: "ACTIVATED",
          message: "ok",
          metadata: null,
          createdAt: d,
        },
      ]);
      const events = await getChannelTimeline("c1");
      expect(findMany).toHaveBeenCalledWith({
        where: { channelId: "c1" },
        orderBy: { createdAt: "desc" },
        take: 200,
      });
      expect(events[0]?.type).toBe("ACTIVATED");
      expect(events[0]?.createdAt).toBe(d.toISOString());
    });
  });
});
