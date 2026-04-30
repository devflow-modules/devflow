/**
 * Estado operacional: canal registado na app sem token Meta (BM ainda não verificada / token pendente).
 */
export function WhatsappPendingActivationCard() {
  return (
    <section
      className="rounded-2xl border border-[color:rgb(245_158_11/0.35)] bg-[color-mix(in_srgb,var(--df-warning-bg)_65%,var(--df-bg-elevated))] p-5 shadow-sm ring-1 ring-[color:rgb(245_158_11/0.18)]"
      aria-label="Ativação do canal WhatsApp"
    >
      <div className="flex flex-wrap items-start gap-3">
        <span className="text-2xl leading-none" aria-hidden>
          👉
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-[var(--df-text-primary)]">Seu número já está configurado</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--df-text-secondary)]">
            Estamos aguardando a aprovação da Meta para ativar o envio de mensagens.
          </p>
          <p className="df-badge-warning mt-3 inline-flex !rounded-full !px-3 !py-1 !text-xs !font-semibold !normal-case !tracking-normal">
            Aguardando ativação
          </p>
        </div>
      </div>
    </section>
  );
}
