import { NextResponse } from "next/server";
import { getCounters } from "@devflow/analytics-core";
import { hasSupabaseConfig } from "@/lib/supabase-server";
import { countTenants } from "@/modules/tenants";
import { countConversations } from "@/modules/conversations";
import { countMessagesLast24h } from "@/modules/messaging";

function isAllowed(request: Request): boolean {
  if (process.env.NODE_ENV === "development") return true;
  const secret = process.env.ADMIN_METRICS_SECRET;
  if (!secret) return false;
  const header = request.headers.get("x-admin-metrics-secret");
  return header === secret;
}

export async function GET(request: Request) {
  if (!isAllowed(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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

  return NextResponse.json({
    whatsapp_platform: { metrics },
    ops: { tenants, conversations, messagesLast24h },
  });
}
