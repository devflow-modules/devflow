import { describe, expect, it, vi, beforeEach } from "vitest";
import { mapWebhookBodyToEvents } from "../whatsappWebhook.mapper";
import { parseInboundWebhookBody } from "../whatsappWebhook.service";

describe("mapWebhookBodyToEvents", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("extrai mensagem", () => {
    const events = mapWebhookBodyToEvents({
      object: "whatsapp_business_account",
      entry: [
        {
          id: "waba1",
          changes: [
            {
              field: "messages",
              value: {
                metadata: { phone_number_id: "pn1" },
                messages: [
                  {
                    id: "m1",
                    from: "5511999999999",
                    timestamp: "1",
                    type: "text",
                    text: { body: "hello" },
                  },
                ],
              },
            },
          ],
        },
      ],
    });
    const msg = events.find((e) => e.kind === "message");
    expect(msg && msg.kind === "message" && msg.messageId).toBe("m1");
  });

  it("extrai status", () => {
    const events = mapWebhookBodyToEvents({
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              field: "messages",
              value: {
                statuses: [
                  {
                    id: "m1",
                    status: "delivered",
                    timestamp: "2",
                    recipient_id: "5511",
                  },
                ],
              },
            },
          ],
        },
      ],
    });
    const st = events.find((e) => e.kind === "status");
    expect(st && st.kind === "status" && st.status).toBe("delivered");
  });

  it("campo desconhecido", () => {
    const events = mapWebhookBodyToEvents({
      object: "whatsapp_business_account",
      entry: [{ changes: [{ field: "account_update", value: { x: 1 } }] }],
    });
    expect(events.some((e) => e.kind === "unknown_field")).toBe(true);
  });

  it("parseInboundWebhookBody payload vazio", () => {
    const { events } = parseInboundWebhookBody({});
    expect(Array.isArray(events)).toBe(true);
  });
});
