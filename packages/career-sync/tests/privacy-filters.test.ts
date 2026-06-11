import { describe, expect, it } from "vitest";
import { redactSensitiveText, shouldRetainRawProviderData } from "../src/index.js";

describe("privacy filters", () => {
  it("redacts emails and links", () => {
    const input =
      "Contact joao@example.com or visit https://example.com/jobs and call +55 11 99999-8888";
    const redacted = redactSensitiveText(input);
    expect(redacted).not.toMatch(/@/);
    expect(redacted).not.toMatch(/https?:\/\//);
    expect(redacted).toContain("[email-redacted]");
    expect(redacted).toContain("[link-redacted]");
  });

  it("redacts meeting links", () => {
    const input = "Join at https://meet.google.com/abc-defg-hij or zoom.us/j/123456789";
    const redacted = redactSensitiveText(input);
    expect(redacted).not.toMatch(/meet\.google\.com/i);
    expect(redacted).not.toMatch(/zoom\.us/i);
    expect(redacted).toContain("[meeting-link-redacted]");
  });

  it("never retains raw provider data", () => {
    expect(shouldRetainRawProviderData()).toBe(false);
  });
});
