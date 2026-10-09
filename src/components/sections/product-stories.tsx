const stories = [
  {
    id: "ownership-heading",
    kicker: "Responsabilidade",
    title: "Nenhuma conversa sem contexto de responsabilidade.",
    copy: "Cada conversa mostra quem assumiu e o que já foi dito. A equipe não precisa reconstruir o caso no privado.",
  },
  {
    id: "routing-heading",
    kicker: "Filas",
    title: "Distribua a operação sem perder contexto.",
    copy: "A fila configurada no diagnóstico recebe a conversa com o histórico. Isso não é roteamento por IA, presença ou carga.",
  },
  {
    id: "handoff-heading",
    kicker: "Pessoa e automação",
    title: "Automação quando faz sentido. Pessoa quando precisa.",
    copy: "Dúvida frequente pode seguir um fluxo permitido. Pedido fora do combinado, sensível ou que precisa de contexto vai para uma pessoa, com a conversa inteira.",
  },
] as const;

function OwnershipPanel() {
  return (
    <div className="rounded-[16px] border border-[var(--df-v2-border)] bg-[var(--df-v2-surface)] p-5">
      <p className="text-sm font-semibold text-[var(--df-v2-ink)]">Pedido em aberto</p>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-full border border-[var(--df-v2-border)] px-3 py-1 text-[var(--df-v2-muted)] line-through decoration-[var(--df-v2-border-strong)]">
          Sem responsável
        </span>
        <span aria-hidden className="text-[var(--df-v2-muted)]">
          →
        </span>
        <span className="rounded-full bg-[var(--df-v2-brand)] px-3 py-1 font-semibold text-white">Bruno</span>
      </div>
      <p className="mt-4 text-sm font-medium text-[var(--df-v2-ink)]">Bruno assumiu a conversa</p>
      <ol className="mt-4 space-y-3 border-t border-[var(--df-v2-border)] pt-4 text-sm" aria-label="Histórico ilustrativo">
        <li className="text-[var(--df-v2-ink-soft)]">
          <span className="font-semibold text-[var(--df-v2-ink)]">Cliente. </span>
          Consigo falar sobre o pedido?
        </li>
        <li className="text-[var(--df-v2-ink-soft)]">
          <span className="font-semibold text-[var(--df-v2-ink)]">Histórico. </span>
          Bruno assumiu e o que já foi dito permanece na conversa.
        </li>
      </ol>
      <p className="mt-4 text-[11px] text-[var(--df-v2-muted)]">Dados ilustrativos. Atribuição mostrada, não automática.</p>
    </div>
  );
}

function RoutingPanel() {
  const rows = [
    ["Pedido em aberto", "Bruno"],
    ["Dúvida de entrega", "Carla"],
    ["Status do pedido", "Bruno"],
  ] as const;

  return (
    <div className="rounded-[16px] border border-[var(--df-v2-border)] bg-[var(--df-v2-surface-muted)] p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[var(--df-v2-ink)]">Fila Comercial</p>
        <span className="rounded-full border border-[var(--df-v2-border-strong)] px-2.5 py-1 text-[11px] font-semibold text-[var(--df-v2-ink-soft)]">
          Precisa resposta
        </span>
      </div>
      <ul className="mt-4 space-y-2" role="list">
        {rows.map(([topic, owner]) => (
          <li
            key={topic}
            className="df-v2-fill flex items-center justify-between gap-3 rounded-[12px] border border-[var(--df-v2-border)] px-3 py-3 text-sm"
          >
            <span className="font-medium text-[var(--df-v2-ink)]">{topic}</span>
            <span className="shrink-0 font-semibold text-[var(--df-v2-brand)]">{owner}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[11px] leading-relaxed text-[var(--df-v2-muted)]">
        Dados ilustrativos. A distribuição segue a fila configurada e leva o histórico junto.
      </p>
    </div>
  );
}

function HandoffPanel() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-[16px] border border-[var(--df-v2-border)] bg-[var(--df-v2-surface)] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--df-v2-brand)]">Fluxo permitido</p>
        <ol className="mt-3 space-y-3 text-sm">
          <li className="font-medium text-[var(--df-v2-ink)]">Dúvida frequente</li>
          <li className="border-t border-[var(--df-v2-border)] pt-3 text-[var(--df-v2-ink-soft)]">Assistência da IA</li>
          <li className="border-t border-[var(--df-v2-border)] pt-3 font-semibold text-[var(--df-v2-ink)]">
            Resposta permitida
          </li>
        </ol>
      </div>
      <div className="rounded-[16px] border border-[var(--df-v2-border-strong)] bg-[var(--df-v2-surface)] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--df-v2-ink)]">Fora do fluxo</p>
        <ol className="mt-3 space-y-3 text-sm">
          <li className="font-medium text-[var(--df-v2-ink)]">Pedido sensível ou sem resposta pronta</li>
          <li className="border-t border-[var(--df-v2-border)] pt-3 text-[var(--df-v2-ink-soft)]">Handoff</li>
          <li className="border-t border-[var(--df-v2-border)] pt-3 font-semibold text-[var(--df-v2-ink)]">
            Carla assume
          </li>
        </ol>
      </div>
      <p className="text-[11px] leading-relaxed text-[var(--df-v2-muted)] sm:col-span-2">
        Dados ilustrativos. A automação não substitui a equipe nem responde fora do que foi permitido.
      </p>
    </div>
  );
}

const panels = [OwnershipPanel, RoutingPanel, HandoffPanel] as const;

export function ProductStories() {
  return (
    <>
      {stories.map((story, index) => {
        const Panel = panels[index];
        return (
          <section
            key={story.id}
            className={index % 2 === 1 ? "df-v2-section bg-[var(--df-v2-surface)]" : "df-v2-section"}
            aria-labelledby={story.id}
          >
            <div
              className={`df-v2-container grid items-center gap-10 lg:grid-cols-12 lg:gap-16 ${
                index % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""
              }`}
            >
              <div className="lg:col-span-6">
                <p className="text-[13px] font-semibold text-[var(--df-v2-brand)]">{story.kicker}</p>
                <h2 id={story.id} className="df-v2-h2 mt-3 text-balance">
                  {story.title}
                </h2>
                <p className="df-v2-lead mt-4">{story.copy}</p>
              </div>
              <div className="lg:col-span-6">
                <Panel />
              </div>
            </div>
          </section>
        );
      })}
    </>
  );
}
