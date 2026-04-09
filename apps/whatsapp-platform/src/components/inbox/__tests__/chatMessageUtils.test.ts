import { describe, it, expect } from "vitest";
import {
  calendarDayKey,
  firstUnreadSeparatorIndex,
  groupMessagesByCalendarDay,
} from "../chatMessageUtils";
import type { WaInboxMessageRow } from "../inboxTypes";

function msg(id: string, ts: string): WaInboxMessageRow {
  return {
    id,
    waMessageId: id,
    direction: "INBOUND",
    fromNumber: "1",
    toNumber: "2",
    messageType: "TEXT",
    contentText: "x",
    contentJson: null,
    ts,
    status: "RECEIVED",
    errorCode: null,
    errorMessage: null,
    createdAt: ts,
  };
}

describe("calendarDayKey", () => {
  it("devolve chave YYYY-MM-DD", () => {
    const key = calendarDayKey("2025-06-10T12:00:00.000Z");
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("firstUnreadSeparatorIndex", () => {
  it("coloca separador antes das últimas N mensagens", () => {
    const messages = [msg("1", "2025-01-01T10:00:00Z"), msg("2", "2025-01-01T10:01:00Z"), msg("3", "2025-01-01T10:02:00Z")];
    expect(firstUnreadSeparatorIndex(messages, 2)).toBe(1);
  });

  it("null se sem não lidas", () => {
    expect(firstUnreadSeparatorIndex([msg("1", "2025-01-01T10:00:00Z")], 0)).toBe(null);
  });
});

describe("groupMessagesByCalendarDay", () => {
  it("cria grupos por dia", () => {
    const a = msg("1", "2025-01-01T10:00:00Z");
    const b = msg("2", "2025-01-02T10:00:00Z");
    const g = groupMessagesByCalendarDay([a, b]);
    expect(g).toHaveLength(2);
    expect(g[0].messages).toHaveLength(1);
    expect(g[1].messages).toHaveLength(1);
  });
});
