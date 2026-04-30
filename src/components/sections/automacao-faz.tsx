import { MessageSquare, Link2, UserRound, ClipboardList, Presentation, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

const actions = [
  {
    icon: MessageSquare,
    title: "Responder perguntas frequentes",
    description: "Horário, preço, entrega, cardápio — respostas automáticas.",
  },
  {
    icon: Link2,
    title: "Enviar link, site ou cardápio",
    description: "Cliente pede e recebe o link na hora.",
  },
  {
    icon: UserRound,
    title: "Encaminhar para humano",
    description: "Quando o cliente pede ou o fluxo exige.",
  },
  {
    icon: ClipboardList,
    title: "Registrar intenção do lead",
    description: "Qualificação automática para priorizar atendimento.",
  },
  {
    icon: Presentation,
    title: "Apresentar demo",
    description: "Enviar vídeo, link ou material de apresentação.",
  },
  {
    icon: Filter,
    title: "Filtrar curiosos de compradores",
    description: "Só vai para humano quem realmente interessa.",
  },
];

export function AutomacaoFaz() {
  return (
    <section
      id="o-que-automacao-faz"
      className="py-24"
      aria-labelledby="automacao-faz-heading"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            id="automacao-faz-heading"
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            O que a automação faz
          </h2>
          <p className="mt-3 df-text-secondary">
            Ações concretas que o robô executa no seu atendimento.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {actions.map((action) => (
            <article
              key={action.title}
              className={cn(
                "rounded-xl border border-border bg-card p-5",
                "transition-all duration-200 hover:border-primary/30 hover:shadow-md"
              )}
            >
              <div className="flex size-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/5">
                <action.icon className="size-5 text-primary" aria-hidden />
              </div>
              <h3 className="mt-3 font-medium text-foreground">{action.title}</h3>
              <p className="mt-1 text-sm df-text-secondary">{action.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
