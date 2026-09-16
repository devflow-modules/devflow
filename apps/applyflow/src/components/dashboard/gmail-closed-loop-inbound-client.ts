import type { InboundEmail } from "@devflow/applyflow-core";

export const GMAIL_CLOSED_LOOP_INBOUND_URL = "/provider-runtime/nango/inbound-responses";

export type GmailClosedLoopInboundClientResult = {
  status: "completed" | "blocked" | "error";
  readOnly: true;
  emails: InboundEmail[];
  accountScopes?: string[];
  processedMessageCount?: number;
  warnings: string[];
  messages?: string[];
};

export async function fetchGmailClosedLoopInboundEmails(input?: { accountScope?: string }): Promise<
  | { ok: true; result: GmailClosedLoopInboundClientResult }
  | { ok: false; reason: "network_error" | "invalid_response" }
> {
  try {
    const response = await fetch(GMAIL_CLOSED_LOOP_INBOUND_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        explicitConsent: true,
        limit: 20,
        ...(input?.accountScope ? { accountScope: input.accountScope } : {}),
      }),
    });
    const payload = (await response.json()) as GmailClosedLoopInboundClientResult;
    if (!payload || !Array.isArray(payload.emails)) {
      return { ok: false, reason: "invalid_response" };
    }
    return { ok: true, result: { ...payload, readOnly: true } };
  } catch {
    return { ok: false, reason: "network_error" };
  }
}
