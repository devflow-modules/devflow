"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchPlaybookSuggestion } from "./inboxFetch";
import { INBOX_QK } from "./inboxTypes";
import { buttonClassName } from "@/components/ui/button";

export function PlaybookSuggest({
  threadId,
  onUseResponse,
  sendDisabled,
}: {
  threadId: string;
  onUseResponse: (text: string) => void;
  sendDisabled: boolean;
}) {
  const qc = useQueryClient();
  const [preview, setPreview] = useState<{
    intent: string;
    recommendedAction: string;
    suggestedResponse: string;
  } | null>(null);

  const mut = useMutation({
    mutationFn: () => fetchPlaybookSuggestion(threadId),
    onSuccess: (data) => {
      setPreview({
        intent: data.intent,
        recommendedAction: data.recommendedAction,
        suggestedResponse: data.suggestedResponse,
      });
      qc.invalidateQueries({ queryKey: INBOX_QK.audit(threadId) });
    },
  });

  return (
    <div className="mb-3 space-y-2">
      <button
        type="button"
        disabled={mut.isPending || sendDisabled}
        className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-950 transition hover:bg-sky-100 disabled:opacity-50 df-focus-brand"
        onClick={() => mut.mutate()}
        data-testid="btn-playbook-suggest"
      >
        {mut.isPending ? "A analisar…" : "Sugerir ação"}
      </button>
      {mut.isError && (
        <p className="text-xs text-red-600">
          {mut.error instanceof Error ? mut.error.message : "Erro no playbook"}
        </p>
      )}
      {preview !== null && (
        <div className="df-panel-playbook" data-testid="playbook-preview">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-900">Playbook (IA)</p>
          <dl className="mt-2 space-y-1.5 text-slate-800">
            <div>
              <dt className="text-[10px] font-semibold text-slate-500">Intent</dt>
              <dd>{preview.intent}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold text-slate-500">Ação recomendada</dt>
              <dd>{preview.recommendedAction}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold text-slate-500">Resposta sugerida</dt>
              <dd className="whitespace-pre-wrap">{preview.suggestedResponse}</dd>
            </div>
          </dl>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className={buttonClassName("primary")}
              onClick={() => {
                onUseResponse(preview.suggestedResponse);
                setPreview(null);
              }}
            >
              Usar resposta no editor
            </button>
            <button type="button" className={buttonClassName("secondary")} onClick={() => setPreview(null)}>
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
