const before = [
  "Conversas sem dono claro",
  "Contexto espalhado no celular",
  "Retorno dependente da memória de quem atendeu",
];

const after = [
  "Responsável visível",
  "Fila e contexto compartilhados",
  "Handoff com histórico da conversa",
];

export function ProblemSolutionSection() {
  return (
    <section id="problema-solucao" className="df-v2-section" aria-labelledby="problem-solution-heading">
      <div className="df-v2-container grid gap-10 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <h2 id="problem-solution-heading" className="df-v2-h2 text-balance">
            Quando todo mundo atende, quem é responsável pela conversa?
          </h2>
        </div>
        <div className="lg:col-span-7">
          <p className="df-v2-lead">
            Sem um dono, a mensagem fica no volume. A DevFlow trata isso como operação: alguém assume, a fila mostra
            o que está parado e o histórico não fica só com uma pessoa.
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div>
              <h3 id="problem-block-heading" className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--df-v2-muted)]">
                Antes
              </h3>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[var(--df-v2-ink-soft)]" role="list">
                {before.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 id="solution-block-heading" className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--df-v2-brand)]">
                Com a DevFlow
              </h3>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[var(--df-v2-ink)]" role="list">
                {after.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-6 text-xs text-[var(--df-v2-muted)]">Modelo de operação. Não é um caso de cliente.</p>
        </div>
      </div>
    </section>
  );
}
