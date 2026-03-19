import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../authService";

describe("authService", () => {
  describe("hashPassword / verifyPassword", () => {
    it("hash e verificação de senha", async () => {
      const password = "senha123";
      const hash = await hashPassword(password);
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      const ok = await verifyPassword(password, hash);
      expect(ok).toBe(true);
      const bad = await verifyPassword("outra", hash);
      expect(bad).toBe(false);
    });
  });
});
