"use client";

import { buttonClassName } from "@/components/ui/button";
import type { InboxConversationsFilter } from "./inboxTypes";

/** Estado vazio quando o filtro não devolve conversas (tenant já tem dados). */
export function InboxFilterEmpty({
  filter,
  hasSecondaryRefinement,
  onSelectNeedsResponse,
}: {
  filter: InboxConversationsFilter;
  hasSecondaryRefinement: boolean;
  onSelectNeedsResponse: () => void;
}) {
  const allClear =
    filter === "needs_response" && !hasSecondaryRefinement;

  const title = allClear
    ? "Tudo em dia"
    : hasSecondaryRefinement
      ? "Nenhum resultado com estes filtros"
      : "Nada por aqui neste filtro";

  const body = allClear
    ? "Nenhuma conversa aguarda resposta neste momento. Quando chegar mensagem nova, aparece aqui."
    : hasSecondaryRefinement
      ? "Alargue em «Mais filtros» (linha) ou mude a fila, ou volte a um filtro de fase acima."
      : "Ajuste o filtro de fase acima ou volte a «Precisa de resposta» para priorizar o atendimento.";

  return (
    <div className="flex min-h-0 flex-1 flex-col p-4" data-testid="conversations-empty">
      <div className="df-inbox-filter-empty-card">
        <div className={allClear ? "df-inbox-empty-icon-success" : "df-inbox-empty-icon-neutral"} aria-hidden>
          {allClear ? (
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          )}
        </div>
        <h3 className="text-[15px] font-semibold tracking-tight text-slate-900">{title}</h3>
        <p className="df-text-muted mt-2">{body}</p>
        {!allClear ? (
          <button type="button" className={`${buttonClassName("primary")} mt-8 w-full max-w-[240px]`} onClick={onSelectNeedsResponse}>
            Precisa de resposta
          </button>
        ) : null}
      </div>
    </div>
  );
}
