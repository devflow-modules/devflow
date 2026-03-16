import Link from "next/link";
import { hasSupabaseConfig } from "@/lib/supabase-server";
import { listConversations } from "@/modules/conversations";
import { listTenants } from "@/modules/tenants";

export default async function ConversationsPage() {
  let conversations: { id: string; wa_from: string; status: string; last_message_at: string }[] = [];
  if (hasSupabaseConfig()) {
    try {
      const tenants = await listTenants();
      const tenantId = tenants[0]?.id;
      if (tenantId) {
        conversations = await listConversations(tenantId, 50);
      }
    } catch {
      // ignore
    }
  }

  return (
    <div className="min-h-screen p-6">
      <h1 className="text-2xl font-semibold mb-4">Conversas</h1>
      <Link href="/dashboard" className="text-blue-600 underline">
        Voltar ao Dashboard
      </Link>
      <div className="mt-4">
        {conversations.length === 0 ? (
          <p className="text-gray-600">Nenhuma conversa ainda. Configure o Supabase e receba mensagens via webhook.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {conversations.map((c) => (
              <li key={c.id} className="flex justify-between px-4 py-3">
                <span className="font-mono text-sm">{c.wa_from}</span>
                <span className="text-sm text-gray-600">{c.status}</span>
                <span className="text-xs text-gray-400">{new Date(c.last_message_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
