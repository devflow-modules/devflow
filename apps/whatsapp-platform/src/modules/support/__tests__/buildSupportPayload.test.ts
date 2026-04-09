import { describe, it, expect } from "vitest";
import { buildSupportPayload } from "../buildSupportPayload";
import type { JwtPayload } from "@/modules/auth/authService";
import type { SupportDiagnostics } from "../supportTypes";

const basePayload: JwtPayload = {
  sub: "user-1",
  email: "a@b.com",
  name: "Nome",
  role: "manager",
  tenantId: "tenant-1",
  jti: "sess-1",
};

const baseDiag: SupportDiagnostics = {
  activationComplete: true,
  phoneConnected: true,
  promptReady: true,
  apiKeyReady: true,
  phoneNumberId: "pnid",
  displayPhoneNumber: "+351 910 000 000",
  lineStatus: "ACTIVE",
  threadCount: 3,
  recentMessagesCount: 12,
};

describe("buildSupportPayload", () => {
  it("monta payload sem credenciais", () => {
    const p = buildSupportPayload({
      debugId: "550e8400-e29b-41d4-a716-446655440000",
      payload: basePayload,
      category: "question",
      description: "  Olá  ",
      pathname: "/inbox",
      userAgent: "Mozilla/5.0",
      environment: "development",
      capturedAtIso: "2026-04-02T12:00:00.000Z",
      diagnostics: baseDiag,
    });
    expect(p.userId).toBe("user-1");
    expect(p.tenantId).toBe("tenant-1");
    expect(p.role).toBe("manager");
    expect(p.email).toBe("a@b.com");
    expect(p.description).toBe("Olá");
    expect(p.pathname).toBe("/inbox");
    expect(p.diagnostics.threadCount).toBe(3);
    expect(p).not.toHaveProperty("accessToken");
    expect(p).not.toHaveProperty("apiKey");
  });
});
