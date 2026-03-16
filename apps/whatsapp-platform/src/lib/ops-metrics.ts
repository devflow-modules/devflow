import { hasSupabaseConfig } from "@/lib/supabase-server";
import { countTenants } from "@/modules/tenants";
import { countConversations } from "@/modules/conversations";
import { countMessagesLast24h } from "@/modules/messaging";
import { APP_PRODUCT_SLUG } from "./constants";

export interface OpsMetricsPayload {
  product: string;
  users: number;
  activeSubscriptions: number;
  pendingCancellation: number;
  mrr: number;
  tenants: number;
  conversations: number;
  messagesLast24h: number;
}

export async function getOpsMetrics(): Promise<OpsMetricsPayload> {
  let tenants = 0;
  let conversations = 0;
  let messagesLast24h = 0;
  if (hasSupabaseConfig()) {
    try {
      tenants = await countTenants();
      conversations = await countConversations();
      messagesLast24h = await countMessagesLast24h();
    } catch {
      // ignore
    }
  }
  return {
    product: APP_PRODUCT_SLUG,
    users: 0,
    activeSubscriptions: 0,
    pendingCancellation: 0,
    mrr: 0,
    tenants,
    conversations,
    messagesLast24h,
  };
}
