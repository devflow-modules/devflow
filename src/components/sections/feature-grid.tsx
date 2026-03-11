import { cn } from "@/lib/utils";

const features = [
  {
    title: "Respostas automáticas",
    description:
      "O sistema responde sozinho perguntas frequentes, 24/7, sem ocupar a equipe.",
  },
  {
    title: "Handoff inteligente",
    description:
      "Quando o cliente pede atendente ou o fluxo exige, a conversa vai para humano na hora.",
  },
  {
    title: "Métricas por horário e intenção",
    description:
      "Veja o que foi automatizado e o que virou atendimento, em tempo real.",
  },
  {
    title: "Relatórios e visão operacional",
    description:
      "Dashboards simples para acompanhar performance e volume da operação.",
  },
  {
    title: "Alertas e limites mensais",
    description:
      "Configure avisos e limites para não perder o controle do volume ou custos.",
  },
  {
    title: "Segurança e confiabilidade",
    description:
      "Infraestrutura estável, logs e rastreabilidade para operar com tranquilidade.",
  },
];

export function FeatureGrid() {
  return (
    <section
      id="recursos"
      className="bg-[#f1f5f9] py-24"
      aria-labelledby="feature-grid-heading"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-primary" aria-hidden />
          <h2
            id="feature-grid-heading"
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Recursos que fazem diferença
          </h2>
          <p className="mt-3 text-slate-600">
            O que a DevFlow entrega para sua operação de atendimento no WhatsApp.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className={cn(
                "rounded-xl border border-border bg-card p-6",
                "transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
              )}
            >
              <h3 className="font-medium text-foreground">{feature.title}</h3>
              <p className="mt-2 text-sm text-slate-600">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
