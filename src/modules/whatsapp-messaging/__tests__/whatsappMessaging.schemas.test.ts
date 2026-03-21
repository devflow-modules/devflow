import { describe, expect, it } from "vitest";
import { sendTextBodySchema } from "../whatsappMessaging.schemas";

describe("sendTextBodySchema", () => {
  it("aceita entrada valida", () => {
    const r = sendTextBodySchema.safeParse({
      to: "5511999999999",
      text: "Hello",
    });
    expect(r.success).toBe(true);
  });

  it("rejeita text vazio", () => {
    const r = sendTextBodySchema.safeParse({ to: "5511999999999", text: "" });
    expect(r.success).toBe(false);
  });
});
