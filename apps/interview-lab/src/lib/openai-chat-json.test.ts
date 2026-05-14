import { afterEach, describe, expect, it, vi } from "vitest";
import { postOpenAiChatJsonCompletion } from "./openai-chat-json";

describe("postOpenAiChatJsonCompletion", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns assistant content from a successful response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          JSON.stringify({
            choices: [{ message: { content: '{"ok":true}' } }],
          }),
      }),
    );
    const content = await postOpenAiChatJsonCompletion({
      apiKey: "sk-test",
      messages: [{ role: "system", content: "sys" }, { role: "user", content: "u" }],
    });
    expect(content).toBe('{"ok":true}');
  });

  it("throws when key is empty", async () => {
    await expect(
      postOpenAiChatJsonCompletion({
        apiKey: "   ",
        messages: [{ role: "user", content: "x" }],
      }),
    ).rejects.toThrow(/empty/);
  });
});
