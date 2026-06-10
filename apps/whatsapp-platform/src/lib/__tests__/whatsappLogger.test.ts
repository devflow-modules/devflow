import { describe, expect, it, vi, afterEach } from "vitest";
import { logWhatsappPilotEvent, parseCloudApiError } from "../observability/whatsappLogger";
import { WHATSAPP_PILOT_EVENTS } from "../observability/pilot-events";

describe("parseCloudApiError", () => {
  it("extrai status HTTP de erros do adapter", () => {
    const parsed = parseCloudApiError(new Error("WhatsApp API error 401: Invalid OAuth"));
    expect(parsed.status).toBe(401);
    expect(parsed.errorCode).toBe("HTTP_401");
  });

  it("retorna undefined quando mensagem não segue padrão", () => {
    const parsed = parseCloudApiError(new Error("CHANNEL_NOT_ACTIVE"));
    expect(parsed.status).toBeUndefined();
    expect(parsed.errorCode).toBeUndefined();
  });
});

describe("logWhatsappPilotEvent", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("emite JSON com trace_id e campos canónicos", () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    logWhatsappPilotEvent("info", "webhook", WHATSAPP_PILOT_EVENTS.WEBHOOK_SIGNATURE_VALIDATED, {
      correlationId: "trace-abc",
      tenantId: "tenant-1",
      origin: "webhook",
    });
    expect(infoSpy).toHaveBeenCalledOnce();
    const line = String(infoSpy.mock.calls[0]?.[1]);
    const parsed = JSON.parse(line) as Record<string, unknown>;
    expect(parsed.event).toBe("webhook_signature_validated");
    expect(parsed.trace_id).toBe("trace-abc");
    expect(parsed.tenant_id).toBe("tenant-1");
    expect(parsed.origin).toBe("webhook");
  });
});
