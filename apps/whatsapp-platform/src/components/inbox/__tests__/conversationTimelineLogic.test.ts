import { describe, it, expect } from "vitest";
import { buildOperationalTimelineRows, timelineRowLabel } from "../conversationTimelineLogic";
import type { WaInboxMessageRow } from "../inboxTypes";

const baseMsg = (over: Partial<WaInboxMessageRow>): WaInboxMessageRow => ({
  id: "x",
  waMessageId: "w",
  direction: "INBOUND",
  fromNumber: "1",
  toNumber: "2",
  messageType: "TEXT",
  contentText: "t",
  contentJson: null,
  ts: new Date().toISOString(),
  status: "RECEIVED",
  errorCode: null,
  errorMessage: null,
  createdAt: new Date().toISOString(),
  ...over,
});

describe("buildOperationalTimelineRows", () => {
  it("marca outbound IA e agente conforme contentJson", () => {
    const t0 = "2026-04-09T10:01:00.000Z";
    const t1 = "2026-04-09T10:01:05.000Z";
    const t2 = "2026-04-09T10:02:00.000Z";
    const rows = buildOperationalTimelineRows([
      baseMsg({ id: "1", ts: t0, contentText: "quanto custa?" }),
      baseMsg({
        id: "2",
        direction: "OUTBOUND",
        ts: t1,
        contentText: "R$ 99",
        contentJson: { outboundKind: "ai" },
      }),
      baseMsg({
        id: "3",
        direction: "OUTBOUND",
        ts: t2,
        contentText: "ok",
        contentJson: { outboundKind: "agent" },
      }),
    ]);
    expect(rows[0]?.kind).toBe("inbound");
    expect(rows[1]?.kind).toBe("outbound_ai");
    expect(timelineRowLabel(rows[1]!)).toContain("IA");
    expect(rows[2]?.kind).toBe("outbound_agent");
  });
});
