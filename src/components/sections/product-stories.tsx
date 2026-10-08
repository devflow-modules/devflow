const stories = [
  {
    id: "ownership-heading",
    kicker: "Responsabilidade",
    title: "Nenhuma conversa sem contexto de responsabilidade.",
    copy: "Cada conversa mostra quem assumiu e o que já foi dito. A equipe não precisa reconstruir o caso no privado.",
    panelTitle: "Responsável",
    rows: [
      ["Pedido em aberto", "Bruno"],
      ["Dúvida de horário", "Sem responsável"],
    ],
  },
  {
    id: "routing-heading",
    kicker: "Filas",
    title: "Distribua a operação sem perder contexto.",
    copy: "Comercial, suporte ou plantão recebem a conversa com o histórico. A fila mostra o que precisa de resposta.",
    panelTitle: "Fila",
    rows: [
      ["Comercial", "Precisa resposta"],
      ["Suporte", "Em atendimento"],
    ],
  },
  {
    id: "handoff-heading",
    kicker: "Pessoa e automação",
    title: "Automação quando faz sentido. Pessoa quando precisa.",
    copy: "O repetitivo segue um fluxo. Negociação, exceção ou contexto humano passam para um operador, com a conversa inteira.",
    panelTitle: "Decisão",
    rows: [
      ["Dúvida frequente", "Fluxo automático"],
      ["Exceção", "Handoff para Carla"],
    ],
  },
] as const;

export function ProductStories() {
  return (
    <>
      {stories.map((story, index) => (
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
              <div className="rounded-[16px] border border-[var(--df-v2-border)] bg-[var(--df-v2-surface)] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--df-v2-muted)]">
                  {story.panelTitle}
                </p>
                <ul className="mt-4 divide-y divide-[var(--df-v2-border)]" role="list">
                  {story.rows.map(([label, value]) => (
                    <li key={label} className="flex items-center justify-between gap-4 py-3 text-sm">
                      <span className="font-medium text-[var(--df-v2-ink)]">{label}</span>
                      <span className="text-[var(--df-v2-ink-soft)]">{value}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] text-[var(--df-v2-muted)]">Dados ilustrativos</p>
              </div>
            </div>
          </div>
        </section>
      ))}
    </>
  );
}
