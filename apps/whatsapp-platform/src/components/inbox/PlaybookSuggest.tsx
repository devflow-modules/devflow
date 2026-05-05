"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchPlaybookSuggestion } from "./inboxFetch";
import { INBOX_QK } from "./inboxTypes";
import { buttonClassName } from "@/components/ui/button";
import { Button } from "@/components/ui/button";

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
    <div className="space-y-1.5">
      <Button
        variant="secondary"
        type="button"
        disabled={mut.isPending || sendDisabled}
        title={sendDisabled && !mut.isPending ? "Disponível após ativação do número" : undefined}
        className="rounded-full border border-[color:rgb(56_189_248/0.4)] bg-[rgb(56_189_248/0.12)] px-2.5 py-1 text-[11px] font-semibold df-text-info transition hover:bg-[rgb(56_189_248/0.18)] disabled:opacity-50 df-focus-brand"
        onClick={() => mut.mutate()}
        data-testid="btn-playbook-suggest"
      >
        {mut.isPending ? "A analisar…" : "Sugerir ação"}
      </Button>
      {mut.isError && (
        <p className="df-text-error text-xs">
          {mut.error instanceof Error ? mut.error.message : "Erro no playbook"}
        </p>
      )}
      {preview !== null && (
        <div className="df-panel-playbook" data-testid="playbook-preview">
          <p className="text-[11px] font-semibold uppercase tracking-wide opacity-95">Playbook (IA)</p>
          <dl className="mt-2 space-y-1.5 df-text-primary">
            <div>
              <dt className="text-[10px] font-semibold df-text-muted">Intent</dt>
              <dd>{preview.intent}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold df-text-muted">Ação recomendada</dt>
              <dd>{preview.recommendedAction}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold df-text-muted">Resposta sugerida</dt>
              <dd className="whitespace-pre-wrap">{preview.suggestedResponse}</dd>
            </div>
          </dl>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              type="button"
              className={buttonClassName("primary")}
              onClick={() => {
                onUseResponse(preview.suggestedResponse);
                setPreview(null);
              }}
            >
              Usar resposta no editor
            </Button>
            <Button variant="secondary" type="button" className={buttonClassName("secondary")} onClick={() => setPreview(null)}>
              Fechar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
