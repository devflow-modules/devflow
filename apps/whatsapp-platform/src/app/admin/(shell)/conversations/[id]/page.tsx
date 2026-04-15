"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button, cn } from "@devflow/ui";
import { fetchProtected, protectedApiUserMessage } from "@/lib/protected-fetch";

type MessageItem = {
  id: string;
  direction: "inbound" | "outbound";
  body: string;
  created_at: string;
};

export default function AdminConversationChatPage() {
  const params = useParams();
  const id = params.id as string;
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    fetchProtected(`/api/admin/conversations/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setCustomerName(d.customerName ?? null))
      .catch(() => {});
  }, [id]);

  const fetchMessages = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const res = await fetchProtected(`/api/admin/conversations/${id}/messages`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(protectedApiUserMessage(res.status, data as { error?: string; message?: string }));
      }
      setMessages(data.messages ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
      setMessages([]);
    }
  }, [id]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetchProtected(`/api/admin/conversations/${id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(protectedApiUserMessage(res.status, data));
      setInput("");
      await fetchMessages();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao enviar");
    } finally {
      setSending(false);
    }
  };

  if (!id) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center py-12">
        <p className="text-slate-600">Conversa não encontrada.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 max-h-[min(85dvh,920px)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/conversations"
            className="text-slate-600 hover:text-slate-900"
            aria-label="Voltar"
          >
            ←
          </Link>
          <h1 className="text-lg font-semibold text-slate-900">
            {customerName ?? `Conversa ${id.slice(0, 8)}…`}
          </h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {error && (
          <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}
        <div className="space-y-3">
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2 text-sm",
                m.direction === "inbound"
                  ? "mr-auto bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/60"
                  : "ml-auto bg-green-600 text-white"
              )}
            >
              <p className="whitespace-pre-wrap break-words">{m.body}</p>
              <p
                className={cn(
                  "mt-1 text-xs",
                  m.direction === "inbound" ? "text-slate-500" : "text-green-200"
                )}
              >
                {new Date(m.created_at).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          ))}
        </div>
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSend}
        className="shrink-0 border-t border-slate-200 bg-white p-3"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
            disabled={sending}
          />
          <Button type="submit" disabled={sending || !input.trim()} size="default">
            {sending ? "…" : "Enviar"}
          </Button>
        </div>
      </form>
    </div>
  );
}
