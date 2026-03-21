const MASK = "***";

export function maskVerifyToken(token: string | undefined, visible = 4): string {
  if (!token || token.length <= visible) return MASK;
  return `${token.slice(0, visible)}${MASK}`;
}

export function maskPhone(phone: string | undefined): string {
  if (!phone) return "";
  const d = phone.replace(/\D/g, "");
  if (d.length <= 4) return MASK;
  return `${d.slice(0, 3)}***${d.slice(-3)}`;
}

export function logWebhookVerification(params: {
  mode: string | undefined;
  tokenMatch: boolean;
  verifyTokenMasked: string;
  result: "success" | "denied" | "invalid_mode" | "missing_challenge";
}): void {
  console.log(
    JSON.stringify({
      scope: "whatsapp_webhook_verify",
      mode: params.mode,
      tokenMatch: params.tokenMatch,
      verifyTokenMasked: params.verifyTokenMasked,
      result: params.result,
      ts: new Date().toISOString(),
    })
  );
}

export function logWebhookInboundSummary(params: {
  object?: string;
  entryCount: number;
  eventsParsed: number;
  kinds: Record<string, number>;
}): void {
  console.log(
    JSON.stringify({
      scope: "whatsapp_webhook_inbound",
      object: params.object,
      entryCount: params.entryCount,
      eventsParsed: params.eventsParsed,
      kinds: params.kinds,
      ts: new Date().toISOString(),
    })
  );
}

export function logWebhookEvent(event: Record<string, unknown>): void {
  console.log(
    JSON.stringify({
      scope: "whatsapp_webhook_event",
      ...event,
      ts: new Date().toISOString(),
    })
  );
}
