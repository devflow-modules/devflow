import { describe, expect, it } from "vitest";
import { metaTimestampToDate, normalizeWaPhone, previewText } from "../whatsappInbox.utils";

describe("whatsappInbox.utils", () => {
  it("normalizeWaPhone remove não dígitos", () => {
    expect(normalizeWaPhone("+55 (11) 99999-9999")).toBe("5511999999999");
  });

  it("metaTimestampToDate unix seconds", () => {
    const d = metaTimestampToDate("1700000000");
    expect(d.getTime()).toBe(1700000000 * 1000);
  });

  it("previewText trunca", () => {
    expect(previewText("x".repeat(300), 10).length).toBeLessThanOrEqual(11);
  });
});
