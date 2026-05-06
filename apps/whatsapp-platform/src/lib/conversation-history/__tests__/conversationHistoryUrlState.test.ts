import { describe, it, expect } from "vitest";
import {
  buildConversationHistorySearchParams,
  DEFAULT_HISTORY_URL_STATE,
  parseConversationHistoryFiltersFromSearchParams,
} from "../conversationHistoryUrlState";

function parse(qs: string) {
  return parseConversationHistoryFiltersFromSearchParams(new URLSearchParams(qs));
}

describe("parseConversationHistoryFiltersFromSearchParams", () => {
  it("defaults quando query vazia", () => {
    expect(parse("")).toEqual(DEFAULT_HISTORY_URL_STATE);
  });

  it("lê phase", () => {
    expect(parse("phase=all").phase).toBe("all");
    expect(parse("phase=in_attendance").phase).toBe("in_attendance");
  });

  it("aceita alias status com os mesmos valores que phase", () => {
    expect(parse("status=awaiting_customer").phase).toBe("awaiting_customer");
  });

  it("ignora phase inválida", () => {
    expect(parse("phase=OPEN").phase).toBe("closed");
  });

  it("lê preset em formato URL", () => {
    expect(parse("preset=LAST_7_DAYS").preset).toBe("7d");
    expect(parse("preset=today").preset).toBe("today");
    expect(parse("preset=CUSTOM").preset).toBe("custom");
  });

  it("infere CUSTOM quando há datas sem preset", () => {
    const s = parse("startDate=2026-05-01&endDate=2026-05-05");
    expect(s.preset).toBe("custom");
    expect(s.customFrom).toBe("2026-05-01");
    expect(s.customTo).toBe("2026-05-05");
  });

  it("rejeita datas mal formadas", () => {
    const s = parse("preset=CUSTOM&startDate=bad&endDate=2026-05-05");
    expect(s.customFrom).toBe("");
    expect(s.customTo).toBe("2026-05-05");
  });

  it("lê search truncado", () => {
    const long = "a".repeat(200);
    const s = parse(`search=${encodeURIComponent(long)}`);
    expect(s.search.length).toBe(120);
  });

  it("lê businessPhoneNumberId", () => {
    expect(parse("businessPhoneNumberId=pn-1").businessPhoneNumberId).toBe("pn-1");
  });
});

describe("buildConversationHistorySearchParams", () => {
  it("URL limpa no estado default", () => {
    const p = buildConversationHistorySearchParams(DEFAULT_HISTORY_URL_STATE);
    expect(p.toString()).toBe("");
  });

  it("inclui phase quando não é default", () => {
    const p = buildConversationHistorySearchParams({
      ...DEFAULT_HISTORY_URL_STATE,
      phase: "all",
    });
    expect(p.get("phase")).toBe("all");
  });

  it("inclui preset e datas em CUSTOM", () => {
    const p = buildConversationHistorySearchParams({
      ...DEFAULT_HISTORY_URL_STATE,
      preset: "custom",
      customFrom: "2026-05-01",
      customTo: "2026-05-05",
    });
    expect(p.get("preset")).toBe("CUSTOM");
    expect(p.get("startDate")).toBe("2026-05-01");
    expect(p.get("endDate")).toBe("2026-05-05");
  });

  it("não inclui datas quando preset não é CUSTOM", () => {
    const p = buildConversationHistorySearchParams({
      ...DEFAULT_HISTORY_URL_STATE,
      preset: "7d",
      customFrom: "2026-05-01",
      customTo: "2026-05-05",
    });
    expect(p.get("preset")).toBe("LAST_7_DAYS");
    expect(p.has("startDate")).toBe(false);
  });

  it("omite search vazio", () => {
    const p = buildConversationHistorySearchParams({
      ...DEFAULT_HISTORY_URL_STATE,
      search: "   ",
    });
    expect(p.has("search")).toBe(false);
  });

  it("round-trip parse → build → parse", () => {
    const a = {
      ...DEFAULT_HISTORY_URL_STATE,
      phase: "awaiting_customer" as const,
      preset: "30d" as const,
      search: "maria",
      businessPhoneNumberId: "pn-x",
    };
    const b = parse(buildConversationHistorySearchParams(a).toString());
    expect(b.phase).toBe(a.phase);
    expect(b.preset).toBe(a.preset);
    expect(b.search).toBe(a.search);
    expect(b.businessPhoneNumberId).toBe(a.businessPhoneNumberId);
  });
});
