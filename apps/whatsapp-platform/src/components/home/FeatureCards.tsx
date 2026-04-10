const ITEMS = [
  {
    title: "Inbox operacional",
    body: "Atenda com contexto, prioridade e histórico completo das conversas.",
  },
  {
    title: "IA e automação",
    body: "Respostas automáticas, follow-ups e reativação de leads sem perder o controlo.",
  },
  {
    title: "Gestão comercial",
    body: "Lead score, funil e oportunidades organizadas em tempo real.",
  },
] as const;

export function FeatureCards() {
  return (
    <section className="mt-20 border-t border-slate-200/80 pt-16" aria-labelledby="valor-heading">
      <h2 id="valor-heading" className="sr-only">
        O que o produto oferece
      </h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {ITEMS.map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-slate-200/90 bg-white/80 p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] ring-1 ring-slate-900/[0.04] backdrop-blur-sm"
          >
            <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
