import { countInboxThreadsTotal, countTenantsTotal } from "@/modules/inbox/waInboxOpsMetrics";
import { countMessagesLast24h } from "@/modules/messaging/waInboxMessageStats";
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
  try {
    [tenants, conversations, messagesLast24h] = await Promise.all([
      countTenantsTotal(),
      countInboxThreadsTotal(),
      countMessagesLast24h(),
    ]);
  } catch {
    // ignore
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
