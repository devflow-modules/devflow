import type { ReactNode } from "react";

type WhatsappStatusSummaryProps = {
  channelConnected: boolean;
  activeCount: number;
  primaryLine: string | null;
  defaultOutboundLine: string | null;
  /** Para contexto quando há várias linhas no canal */
  totalNumbers: number;
};

function SummaryValue({ children }: { children: ReactNode }) {
  return <dd className="mt-1 text-sm font-semibold leading-snug text-slate-900">{children}</dd>;
}

function PlaceholderDefinicao() {
  return (
    <span className="block text-sm font-normal italic text-slate-500">Ainda não definido</span>
  );
}

export function WhatsappStatusSummary({
  channelConnected,
  activeCount,
  primaryLine,
  defaultOutboundLine,
  totalNumbers,
}: WhatsappStatusSummaryProps) {
  const multiLine = totalNumbers > 1;

  return (
    <section
      className="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/40 p-5 shadow-sm"
      aria-label="Resumo do canal WhatsApp"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Estado do canal</h2>
        {multiLine ? (
          <p className="text-xs text-slate-500">
            {totalNumbers} números neste canal — escolha qual é principal e qual usar no envio padrão.
          </p>
        ) : null}
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3 lg:min-h-[5.25rem]">
          <dt className="text-xs font-medium text-slate-500">Canal</dt>
          <dd className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <span
              className={`inline-block h-2 w-2 shrink-0 rounded-full ${channelConnected ? "bg-emerald-500" : "bg-slate-300"}`}
              aria-hidden
            />
            {channelConnected ? "Ligado" : "Sem número ligado"}
          </dd>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3 lg:min-h-[5.25rem]">
          <dt className="text-xs font-medium text-slate-500">Números ativos</dt>
          <SummaryValue>
            <span className="tabular-nums">{activeCount}</span>
          </SummaryValue>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3 lg:min-h-[5.25rem]">
          <dt className="text-xs font-medium text-slate-500">Número principal</dt>
          {primaryLine ? (
            <SummaryValue>{primaryLine}</SummaryValue>
          ) : (
            <dd className="mt-1">
              <PlaceholderDefinicao />
            </dd>
          )}
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3 lg:min-h-[5.25rem]">
          <dt className="text-xs font-medium text-slate-500">Envio padrão</dt>
          {defaultOutboundLine ? (
            <SummaryValue>{defaultOutboundLine}</SummaryValue>
          ) : (
            <dd className="mt-1">
              <PlaceholderDefinicao />
            </dd>
          )}
        </div>
      </dl>
    </section>
  );
}
