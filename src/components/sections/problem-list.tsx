import { cn } from "@/lib/utils";

const problems = [
  {
    title: "Atendimento repetitivo",
    description:
      "Perguntas sobre entrega, horário, pagamento e pedidos tomam tempo da equipe.",
  },
  {
    title: "Falta de controle",
    description:
      "Sem métricas, fica difícil saber o que o bot resolveu e o que virou atendimento humano.",
  },
  {
    title: "Crescimento desorganizado",
    description:
      "Sem automação e handoff, o volume aumenta e a operação fica dependente de resposta manual.",
  },
];

export function ProblemList() {
  return (
    <section
      id="problemas"
      className="bg-[#f1f5f9] py-24"
      aria-labelledby="problem-list-heading"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-primary" aria-hidden />
          <h2
            id="problem-list-heading"
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Problemas que a DevFlow resolve
          </h2>
          <p className="mt-3 df-text-secondary">
            Se você vive alguns desses, provavelmente precisa de automação com
            controle.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-3">
          {problems.map((problem) => (
            <article
              key={problem.title}
              className={cn(
                "rounded-xl border border-border bg-card p-6",
                "transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
              )}
            >
              <h3 className="font-medium text-foreground">{problem.title}</h3>
              <p className="mt-2 text-sm df-text-secondary">
                {problem.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
