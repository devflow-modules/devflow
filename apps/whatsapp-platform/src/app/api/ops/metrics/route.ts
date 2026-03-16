import { NextResponse } from "next/server";
import { APP_PRODUCT_SLUG } from "@/lib/constants";
import { hasSupabaseConfig } from "@/lib/supabase-server";
import { countTenants } from "@/modules/tenants";
import { countConversations } from "@/modules/conversations";
import { countMessagesLast24h } from "@/modules/messaging";

/**
 * Contrato Ops: GET /api/ops/metrics
 * Billing (users, activeSubscriptions, pendingCancellation, mrr): 0 — não implementado para este produto.
 * tenants, conversations, messagesLast24h: dados reais do Supabase quando configurado.
 */
export async function GET() {
  let tenants = 0;
  let conversations = 0;
  let messagesLast24h = 0;

  if (hasSupabaseConfig()) {
    try {
      tenants = await countTenants();
      conversations = await countConversations();
      messagesLast24h = await countMessagesLast24h();
    } catch (err) {
      console.error("[Ops metrics]", err);
    }
  }

  const payload = {
    product: APP_PRODUCT_SLUG,
    users: 0,
    activeSubscriptions: 0,
    pendingCancellation: 0,
    mrr: 0,
    tenants,
    conversations,
    messagesLast24h,
  };
  return NextResponse.json(payload);
}
