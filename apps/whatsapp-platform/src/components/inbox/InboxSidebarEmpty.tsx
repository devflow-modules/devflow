"use client";

import { buttonClassName } from "@/components/ui/button";

/** Estado vazio quando o filtro não devolve conversas (tenant já tem dados). */
export function InboxFilterEmpty({ onSelectNeedsResponse }: { onSelectNeedsResponse: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col p-4" data-testid="conversations-empty">
      <div className="mx-auto flex w-full max-w-sm flex-col items-center rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white via-white to-slate-50/95 px-6 py-10 text-center shadow-[0_8px_40px_rgba(15,23,42,0.06)]">
        <div
          className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--df-brand-50)] text-[var(--df-brand-600)] ring-1 ring-[var(--df-brand-500)]/15"
          aria-hidden
        >
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </div>
        <h3 className="text-[15px] font-semibold tracking-tight text-slate-900">Nada por aqui neste filtro</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Ajuste o filtro acima ou volte às conversas que precisam de resposta para priorizar o atendimento.
        </p>
        <button type="button" className={`${buttonClassName("primary")} mt-8 w-full max-w-[240px]`} onClick={onSelectNeedsResponse}>
          Precisa de resposta
        </button>
      </div>
    </div>
  );
}
