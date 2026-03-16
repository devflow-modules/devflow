"use server";

import { getCounters } from "@devflow/analytics-core";
import { hasSupabaseConfig } from "@/lib/supabase-server";
import { countTenants } from "@/modules/tenants";
import { countConversations } from "@/modules/conversations";
import { countMessagesLast24h } from "@/modules/messaging";

export type AdminMetricsPayload = {
  whatsapp_platform: { metrics: Record<string, number> };
  ops: { tenants: number; conversations: number; messagesLast24h: number };
};

export async function getAdminMetrics(): Promise<AdminMetricsPayload> {
  const metrics = getCounters();
  let tenants = 0;
  let conversations = 0;
  let messagesLast24h = 0;
  if (hasSupabaseConfig()) {
    try {
      tenants = await countTenants();
      conversations = await countConversations();
      messagesLast24h = await countMessagesLast24h();
    } catch (err) {
      console.error("[admin/metrics]", err);
    }
  }

  return {
    whatsapp_platform: { metrics },
    ops: { tenants, conversations, messagesLast24h },
  };
}
