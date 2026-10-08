import { X, Check, AlertTriangle } from "lucide-react";

const problems = [
  "Mensagens importantes se perdem no volume",
  "Cliente espera resposta e procura outro fornecedor",
  "Equipe responde manualmente as mesmas dúvidas todos os dias",
  "Ninguém sabe exatamente o que está parado, atrasado ou em risco",
  "Falta histórico, fila e responsável",
];

const changes = [
  "O repetitivo deixa de depender de alguém no celular",
  "A conversa que pede uma pessoa segue para a equipe com contexto",
  "Dá para ver o que está parado e quem responde",
  "O histórico não fica só na memória de quem atendeu",
  "A implantação começa pelo diagnóstico da operação atual",
];

export function ProblemSolutionSection() {
  return (
    <section
      id="problema-solucao"
      className="border-y df-border-brand bg-[var(--devflow-surface)] py-24 sm:py-28"
      aria-labelledby="problem-solution-heading"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-primary" aria-hidden />
          <h2
            id="problem-solution-heading"
            className="df-text-primary text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            Seu WhatsApp não precisa depender do improviso
          </h2>
          <p className="df-text-secondary mt-3 text-base leading-relaxed sm:text-lg">
            Quando tudo fica no celular, na memória da equipe ou em conversas soltas, o atendimento atrasa e a
            venda esfria.
          </p>
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-2 lg:gap-10">
          <article
            className="rounded-2xl border df-bg-danger-soft p-6 sm:p-8"
            aria-labelledby="problem-block-heading"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl df-bg-danger-soft">
                <AlertTriangle className="size-5 df-status-danger" aria-hidden />
              </div>
              <h3 id="problem-block-heading" className="df-text-primary text-lg font-bold">
                O problema
              </h3>
            </div>
            <p className="df-text-secondary mt-3 text-sm leading-relaxed">
              WhatsApp desorganizado gera demora, mensagem perdida e equipe sobrecarregada.
            </p>
            <ul className="mt-5 space-y-3" role="list">
              {problems.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <X className="mt-0.5 size-4 shrink-0 df-status-danger" aria-hidden />
                  <span className="df-text-primary text-sm leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </article>

          <article
            className="rounded-2xl border df-bg-brand-soft p-6 sm:p-8"
            aria-labelledby="solution-block-heading"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl df-bg-brand-soft">
                <Check className="size-5 df-status-brand" aria-hidden />
              </div>
              <h3 id="solution-block-heading" className="df-text-primary text-lg font-bold">
                O que muda
              </h3>
            </div>
            <p className="df-text-secondary mt-3 text-sm leading-relaxed">
              A operação passa a ter dono, contexto e um caminho claro até uma pessoa.
            </p>
            <ul className="mt-5 space-y-3" role="list">
              {changes.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 size-4 shrink-0 df-status-success" aria-hidden />
                  <span className="df-text-primary text-sm leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}
