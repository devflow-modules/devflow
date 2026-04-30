import { cn } from "@/lib/utils";

const metrics = [
  {
    value: "24/7",
    label: "Atendimento automático",
  },
  {
    value: "70%",
    label: "Mensagens automatizadas",
    sub: "até 70% resolvidas sem humano",
  },
  {
    value: "100%",
    label: "Conversas registradas",
  },
  {
    value: "—",
    label: "Handoff automático",
    sub: "para equipe humana",
  },
];

export function Metrics() {
  return (
    <section
      id="impacto"
      className="bg-[#f1f5f9] py-24"
      aria-labelledby="metrics-heading"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div
            className="mx-auto mb-4 h-1 w-12 rounded-full bg-primary"
            aria-hidden
          />
          <h2
            id="metrics-heading"
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Impacto operacional
          </h2>
          <p className="mt-3 df-text-secondary">
            Números reais de operações usando a DevFlow.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <article
              key={metric.label}
              className={cn(
                "rounded-xl border border-border bg-card p-6 text-center",
                "transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
              )}
            >
              <p className="text-4xl font-bold text-primary sm:text-5xl">
                {metric.value}
              </p>
              <p className="mt-2 font-medium text-foreground">{metric.label}</p>
              {metric.sub && (
                <p className="mt-1 text-xs df-text-secondary">{metric.sub}</p>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
