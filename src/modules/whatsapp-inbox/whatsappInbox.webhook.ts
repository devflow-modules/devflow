import type { PrismaClient } from "@prisma/client";
import type { ParsedWebhookEvent } from "@/modules/whatsapp-webhook/whatsappWebhook.types";
import { createInboundMessage, updateMessageStatusFromWebhook } from "./whatsappInbox.message.service";

/**
 * Persiste eventos do webhook (mensagens + status). Erros são engolidos por evento
 * para não bloquear demais handlers; log no service.
 */
function sortEventsForPersistence(events: ParsedWebhookEvent[]): ParsedWebhookEvent[] {
  const rank: Record<string, number> = {
    message: 0,
    errors: 1,
    status: 2,
    unknown_field: 3,
    unknown_object: 4,
  };
  return [...events].sort(
    (a, b) => (rank[a.kind] ?? 9) - (rank[b.kind] ?? 9)
  );
}

export async function persistWebhookEvents(
  prisma: PrismaClient,
  events: ParsedWebhookEvent[]
): Promise<void> {
  for (const ev of sortEventsForPersistence(events)) {
    try {
      if (ev.kind === "message") {
        await createInboundMessage(prisma, ev);
      } else if (ev.kind === "status") {
        await updateMessageStatusFromWebhook(prisma, ev);
      }
    } catch {
      /* já logado em createInbound / updateMessageStatus */
    }
  }
}
