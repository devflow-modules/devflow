"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createInternalNoteApi, deleteInternalNoteApi, fetchInternalNotes } from "./inboxFetch";
import { INBOX_QK } from "./inboxTypes";
import { buttonClassName } from "@/components/ui/button";
import { fieldControlBase } from "@/components/ui/form-field";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";

export function InternalNotesPanel({
  threadId,
  onClose,
}: {
  threadId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");

  const { data: notes = [], isLoading } = useQuery({
    queryKey: INBOX_QK.internalNotes(threadId),
    queryFn: () => fetchInternalNotes(threadId),
  });

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: INBOX_QK.internalNotes(threadId) });
    qc.invalidateQueries({ queryKey: INBOX_QK.audit(threadId) });
  }, [qc, threadId]);

  const createMut = useMutation({
    mutationFn: (body: string) => createInternalNoteApi(threadId, body),
    onSuccess: () => {
      setDraft("");
      invalidate();
    },
  });

  const deleteMut = useMutation({
    mutationFn: (noteId: string) => deleteInternalNoteApi(threadId, noteId),
    onSuccess: () => invalidate(),
  });

  const add = () => {
    const text = draft.trim();
    if (!text || createMut.isPending) return;
    createMut.mutate(text);
  };

  return (
    <div
      className="border-b border-[rgb(245_158_11/0.22)] bg-[rgb(245_158_11/0.06)] px-4 py-3 sm:px-6"
      data-testid="internal-notes-panel"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="df-text-warning text-xs font-semibold uppercase tracking-wide opacity-95">
              Notas internas
            </p>
            <p className="text-[10px] df-text-warning opacity-75">
              Guardadas no servidor · visíveis à equipa · não vão para o WhatsApp
            </p>
          </div>
          <Button variant="secondary" type="button" className={buttonClassName("ghost")} onClick={onClose}>
            Fechar
          </Button>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="sr-only" htmlFor="internal-note">
            Nova nota
          </label>
          <textarea
            id="internal-note"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Lembrete para a equipa (não é enviado ao WhatsApp)…"
            rows={2}
            disabled={createMut.isPending}
            className={`min-h-[44px] flex-1 resize-none text-sm ${fieldControlBase} border-[rgb(245_158_11/0.35)] bg-card/90`}
          />
          <Button
            variant="disabled"
            type="button"
            className={buttonClassName("secondary")}
            disabled={createMut.isPending || !draft.trim()}
            onClick={add}
            data-testid="internal-note-save"
          >
            {createMut.isPending ? "A guardar…" : "Guardar nota"}
          </Button>
        </div>
        {createMut.isError && (
          <p className="df-text-error text-xs">
            {createMut.error instanceof Error ? createMut.error.message : "Erro ao guardar"}
          </p>
        )}
        {isLoading ? (
          <p className="text-xs df-text-warning opacity-75">A carregar notas…</p>
        ) : notes.length > 0 ? (
          <ul className="max-h-40 space-y-2 overflow-y-auto text-sm">
            {notes.map((n) => (
              <li
                key={n.id}
                className="flex items-start justify-between gap-2 rounded-lg border border-[rgb(245_158_11/0.22)] bg-card/80 px-3 py-2 df-text-primary"
              >
                <div>
                  <p className="whitespace-pre-wrap">{n.body}</p>
                  <p className="mt-1 text-[10px] df-text-muted">
                    {n.authorName ? `${n.authorName} · ` : ""}
                    {new Date(n.createdAt).toLocaleString("pt-BR")}
                  </p>
                </div>
                <Button
                  variant="disabled"
                  type="button"
                  className="df-text-warning shrink-0 text-xs opacity-85 hover:opacity-100 disabled:opacity-50"
                  disabled={deleteMut.isPending}
                  onClick={() => deleteMut.mutate(n.id)}
                  aria-label="Remover nota"
                >
                  ×
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs df-text-warning opacity-75">Ainda não há notas para esta conversa.</p>
        )}
      </div>
    </div>
  );
}
