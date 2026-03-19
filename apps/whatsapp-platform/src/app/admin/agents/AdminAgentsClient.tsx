"use client";

import { useState, useEffect } from "react";

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
  conversationId: string;
  priority: number;
  queuedAt: string;
};

export function AdminAgentsClient() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [queues, setQueues] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    Promise.all([
      fetch("/api/admin/agent-status").then((r) => (r.ok ? r.json() : { agents: [] })),
      fetch("/api/admin/queues").then((r) => (r.ok ? r.json() : { queues: [] })),
    ]).then(([a, q]) => {
      setAgents(a.agents ?? []);
      setQueues(q.queues ?? []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const setStatus = async (userId: string, status: string) => {
    const res = await fetch("/api/admin/agent-status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, status }),
    });
    if (res.ok) load();
  };

  if (loading) return <p className="mt-4 text-slate-600">Carregando…</p>;

  return (
    <div className="mt-6 space-y-6">
      <div>
        <h2 className="text-lg font-medium mb-2">Fila de conversas ({queues.length})</h2>
        {queues.length === 0 ? (
          <p className="text-sm text-slate-600">Nenhuma conversa na fila.</p>
        ) : (
          <ul className="rounded border divide-y text-sm">
            {queues.map((q) => (
              <li key={q.id} className="px-3 py-2 flex justify-between">
                <span className="font-mono">{q.conversationId.slice(0, 8)}…</span>
                <span>prioridade {q.priority}</span>
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
                <span className="text-slate-600 text-sm ml-2">({a.email})</span>
                {a.currentConversationId && (
                  <span className="text-xs text-amber-600 ml-2">em conversa</span>
                )}
              </div>
              <div className="flex gap-2">
                {(["available", "busy", "offline"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(a.id, s)}
                    className={`px-2 py-1 rounded text-sm ${
                      a.status === s ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {s === "available" ? "Disponível" : s === "busy" ? "Ocupado" : "Offline"}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
        {agents.length === 0 && (
          <p className="text-sm text-slate-600 mt-2">
            Usuários do tenant (admin/agent) aparecem aqui. Ajuste o status manualmente.
          </p>
        )}
      </div>
    </div>
  );
}
