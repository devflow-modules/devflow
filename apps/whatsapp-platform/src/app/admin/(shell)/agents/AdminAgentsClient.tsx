"use client";

import { useState, useEffect } from "react";
import { fetchProtected } from "@/lib/protected-fetch";
import { Button } from "@/components/ui/button";

type Agent = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  currentConversationId: string | null;
};

type QueueEntry = {
  id: string;
  threadId: string;
  conversationId: string;
  phoneNumber?: string;
  contactName?: string | null;
  priority: number;
  queuedAt: string;
  lastMessagePreview?: string | null;
};

export function AdminAgentsClient() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [queues, setQueues] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    Promise.all([
      fetchProtected("/api/admin/agent-status").then((r) => (r.ok ? r.json() : { agents: [] })),
      fetchProtected("/api/admin/queues").then((r) => (r.ok ? r.json() : { queues: [] })),
    ])
      .then(([a, q]) => {
        setAgents(a.agents ?? []);
        setQueues(q.queues ?? []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const setStatus = async (userId: string, status: string) => {
    const res = await fetchProtected("/api/admin/agent-status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, status }),
    });
    if (res.ok) load();
  };

  if (loading) return <p className="mt-4 df-text-secondary">Carregando…</p>;

  return (
    <div className="mt-6 space-y-6">
      <div>
        <h2 className="text-lg font-medium mb-2">Fila de conversas ({queues.length})</h2>
        {queues.length === 0 ? (
          <p className="text-sm df-text-secondary">Nenhuma conversa na fila.</p>
        ) : (
          <ul className="rounded border divide-y text-sm">
            {queues.map((q) => (
              <li key={q.id} className="px-3 py-2 flex justify-between gap-2">
                <span className="font-mono truncate" title={q.threadId}>
                  {q.contactName || q.phoneNumber || `${q.threadId.slice(0, 8)}…`}
                </span>
                <span className="shrink-0 df-text-muted">prioridade {q.priority}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h2 className="text-lg font-medium mb-2">Equipe e disponibilidade</h2>
        <ul className="rounded border divide-y">
          {agents.map((a) => (
            <li key={a.id} className="px-3 py-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-medium">{a.name}</span>
                <span className="df-text-secondary text-sm ml-2">({a.email})</span>
                {a.currentConversationId && (
                  <span className="text-xs text-amber-600 ml-2">em conversa</span>
                )}
              </div>
              <div className="flex gap-2">
                {(["available", "busy", "offline"] as const).map((s) => (
                  <Button variant="secondary"
                    key={s}
                    type="button"
                    onClick={() => setStatus(a.id, s)}
                    className={`px-2 py-1 rounded text-sm ${
                      a.status === s ? "bg-blue-600 text-white" : "bg-muted df-text-secondary"
                    }`}
                  >
                    {s === "available" ? "Disponível" : s === "busy" ? "Ocupado" : "Offline"}
                  </Button>
                ))}
              </div>
            </li>
          ))}
        </ul>
        {agents.length === 0 && (
          <p className="text-sm df-text-secondary mt-2">
            Usuários do tenant (admin/agent) aparecem aqui. Ajuste o status manualmente.
          </p>
        )}
      </div>
    </div>
  );
}
