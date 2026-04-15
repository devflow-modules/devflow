/**
 * Estado operacional: canal registado na app sem token Meta (BM ainda não verificada / token pendente).
 */
export function WhatsappPendingActivationCard() {
  return (
    <section
      className="rounded-2xl border border-amber-200/90 bg-amber-50/70 p-5 shadow-sm"
      aria-label="Ativação do canal WhatsApp"
    >
      <div className="flex flex-wrap items-start gap-3">
        <span className="text-2xl leading-none" aria-hidden>
          👉
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-slate-900">Seu número já está configurado</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            Estamos aguardando a aprovação da Meta para ativar o envio de mensagens.
          </p>
          <p className="mt-3 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-950">
            Aguardando ativação
          </p>
        </div>
      </div>
    </section>
  );
}
