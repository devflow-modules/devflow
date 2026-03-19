import { describe, expect, it } from "vitest";
import { parseWaInboxWebhookPayload } from "../waInboxWebhookParser";

describe("parseWaInboxWebhookPayload", () => {
  it("extrai inbound e status", () => {
    const body = {
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              field: "messages",
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  phone_number_id: "pn1",
                  display_phone_number: "+55 13 99999",
                },
                contacts: [{ wa_id: "5511999999999", profile: { name: "Ana" } }],
                messages: [
                  {
                    id: "wamid.in1",
                    from: "5511999999999",
                    timestamp: "1700000000",
                    type: "text",
                    text: { body: "oi" },
                  },
                ],
                statuses: [{ id: "wamid.out1", status: "delivered", timestamp: "1700000001" }],
              },
            },
          ],
        },
      ],
    };
    const { inbound, statuses } = parseWaInboxWebhookPayload(body);
    expect(inbound).toHaveLength(1);
    expect(inbound[0].waMessageId).toBe("wamid.in1");
    expect(inbound[0].contactName).toBe("Ana");
    expect(statuses).toHaveLength(1);
    expect(statuses[0].status).toBe("delivered");
  });

  it("ignora smb_message_echoes", () => {
    const body = {
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              field: "smb_message_echoes",
              value: {
                messaging_product: "whatsapp",
                messages: [{ id: "echo1", from: "5511", timestamp: "1", type: "text" }],
              },
            },
          ],
        },
      ],
    };
    const { inbound } = parseWaInboxWebhookPayload(body);
    expect(inbound).toHaveLength(0);
  });
});
