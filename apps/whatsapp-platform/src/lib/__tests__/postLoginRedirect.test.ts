import { describe, expect, it } from "vitest";
import { resolvePostLoginRedirect } from "../postLoginRedirect";

describe("resolvePostLoginRedirect", () => {
  it("admin usa next seguro ou default", () => {
    expect(resolvePostLoginRedirect("/dashboard", "admin")).toBe("/dashboard");
    expect(resolvePostLoginRedirect(null, "admin")).toBe("/dashboard/whatsapp");
  });

  it("agent vai para inbox por omissão", () => {
    expect(resolvePostLoginRedirect(null, "agent")).toBe("/inbox");
  });

  it("agent respeita next operacional", () => {
    expect(resolvePostLoginRedirect("/inbox", "agent")).toBe("/inbox");
    expect(resolvePostLoginRedirect("/dashboard", "agent")).toBe("/dashboard");
  });

  it("agent não segue next para onboarding ou settings", () => {
    expect(resolvePostLoginRedirect("/onboarding", "agent")).toBe("/inbox");
    expect(resolvePostLoginRedirect("/settings", "agent")).toBe("/inbox");
    expect(resolvePostLoginRedirect("/dashboard/whatsapp", "agent")).toBe("/inbox");
  });
});
