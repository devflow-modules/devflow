import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockSendWithResend = vi.hoisted(() => vi.fn());
const mockEmailCreate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    emailMessage: {
      create: (...args: unknown[]) => mockEmailCreate(...args),
    },
  },
}));

vi.mock("../infrastructure/resendClient", () => ({
  sendWithResend: (...a: unknown[]) => mockSendWithResend(...a),
}));

vi.mock("../infrastructure/emailLogger", () => ({
  logTransactionalEmailOutcome: vi.fn(),
}));

describe("sendTransactionalEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_FROM = "noreply@example.com";
    mockSendWithResend.mockResolvedValue({ ok: true, messageId: "msg_1" });
    mockEmailCreate.mockResolvedValue({ id: "em1" });
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
    delete process.env.RESEND_FROM;
    delete process.env.RESEND_FROM_EMAIL;
  });

  it("envia RESET_PASSWORD com sucesso e persiste SENT", async () => {
    const { sendTransactionalEmail } = await import("../application/sendTransactionalEmail");
    const r = await sendTransactionalEmail({
      type: "RESET_PASSWORD",
      to: "user@test.com",
      tenantId: "t1",
      userId: "u1",
      payload: { resetUrl: "https://app.test/reset?token=supersecret" },
    });
    expect(r.ok).toBe(true);
    expect(r.providerMessageId).toBe("msg_1");
    expect(mockSendWithResend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user@test.com",
        subject: "Redefina sua senha",
      })
    );
    const html = mockSendWithResend.mock.calls[0][0].html as string;
    expect(html).toContain("Redefinição de senha");
    expect(mockEmailCreate).toHaveBeenCalled();
    const data = mockEmailCreate.mock.calls[0][0].data as { metadata?: { resetUrl?: string } };
    expect(data.metadata?.resetUrl).toBe("https://app.test/reset?[REDACTED_QUERY]");
  });

  it("envia PASSWORD_CHANGED com sucesso", async () => {
    const { sendTransactionalEmail } = await import("../application/sendTransactionalEmail");
    const r = await sendTransactionalEmail({
      type: "PASSWORD_CHANGED",
      to: "user@test.com",
      tenantId: "t1",
      userId: "u1",
      payload: { userName: "Ana" },
    });
    expect(r.ok).toBe(true);
    expect(mockSendWithResend).toHaveBeenCalledWith(
      expect.objectContaining({ subject: "Sua senha foi alterada" })
    );
  });

  it("quando Resend falha grava FAILED", async () => {
    mockSendWithResend.mockResolvedValue({
      ok: false,
      errorCode: "RESEND_ERROR",
      errorMessage: "upstream",
    });
    const { sendTransactionalEmail } = await import("../application/sendTransactionalEmail");
    const r = await sendTransactionalEmail({
      type: "WELCOME",
      to: "user@test.com",
      payload: { loginUrl: "https://app.test/login" },
    });
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe("EMAIL_SEND_FAILED");
    const data = mockEmailCreate.mock.calls[0][0].data as { status: string; errorCode?: string };
    expect(data.status).toBe("FAILED");
    expect(data.errorCode).toBe("RESEND_ERROR");
  });

  it("rejeita tipo inválido", async () => {
    const { sendTransactionalEmail } = await import("../application/sendTransactionalEmail");
    const r = await sendTransactionalEmail({
      type: "UNKNOWN_TYPE",
      to: "user@test.com",
      payload: {},
    } as never);
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe("INVALID_EMAIL_TYPE");
    expect(mockSendWithResend).not.toHaveBeenCalled();
  });

  it("EMAIL_NOT_CONFIGURED sem RESEND_API_KEY", async () => {
    delete process.env.RESEND_API_KEY;
    const { sendTransactionalEmail } = await import("../application/sendTransactionalEmail");
    const r = await sendTransactionalEmail({
      type: "WELCOME",
      to: "user@test.com",
      payload: { loginUrl: "https://app.test/login" },
    });
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe("EMAIL_NOT_CONFIGURED");
    expect(mockSendWithResend).not.toHaveBeenCalled();
    expect(mockEmailCreate).not.toHaveBeenCalled();
  });

  it("aceita RESEND_FROM_EMAIL quando EMAIL_FROM e RESEND_FROM estão ausentes", async () => {
    delete process.env.EMAIL_FROM;
    delete process.env.RESEND_FROM;
    process.env.RESEND_FROM_EMAIL = "noreply@alias.example.com";
    const { sendTransactionalEmail } = await import("../application/sendTransactionalEmail");
    const r = await sendTransactionalEmail({
      type: "WELCOME",
      to: "user@test.com",
      payload: { loginUrl: "https://app.test/login" },
    });
    expect(r.ok).toBe(true);
    expect(mockSendWithResend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: expect.stringContaining("noreply@alias.example.com"),
      })
    );
  });
});
