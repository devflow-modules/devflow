const ITEMS = [
  {
    title: "Inbox operacional",
    body: "Todas as conversas num só sítio: contexto, prioridade e histórico para a equipa não perder nada.",
  },
  {
    title: "IA e automação",
    body: "Primeira resposta, regras e fluxos alinhados ao negócio — com supervisão humana.",
  },
  {
    title: "Controlo da operação",
    body: "Filas, responsáveis e visão do que está em aberto para responder rápido e bem.",
  },
] as const;

export function FeatureCards() {
  return (
    <section className="mt-20 border-t border-border/80 pt-16" aria-labelledby="valor-heading">
      <h2 id="valor-heading" className="sr-only">
        O que o produto oferece
      </h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {ITEMS.map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-border/90 bg-card/80 p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] ring-1 ring-slate-900/[0.04] backdrop-blur-sm"
          >
            <h3 className="text-base font-semibold df-text-primary">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed df-text-secondary">{item.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
