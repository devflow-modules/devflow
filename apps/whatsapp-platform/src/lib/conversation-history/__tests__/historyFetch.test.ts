import { describe, it, expect } from "vitest";
import { buildHistoryConversationsUrl } from "../historyFetch";

describe("buildHistoryConversationsUrl", () => {
  it("inclui businessPhoneNumberId quando definido", () => {
    const u = buildHistoryConversationsUrl({
      phase: "closed",
      businessPhoneNumberId: "1234567890",
      limit: 50,
    });
    expect(u).toContain("businessPhoneNumberId=1234567890");
    expect(u).toContain("phase=closed");
  });

  it("omite businessPhoneNumberId quando vazio", () => {
    const u = buildHistoryConversationsUrl({
      phase: "all",
      businessPhoneNumberId: "   ",
    });
    expect(u).not.toContain("businessPhoneNumberId");
  });
});
