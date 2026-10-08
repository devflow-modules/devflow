import { Inbox, Bot, ListOrdered, Plug } from "lucide-react";

const capabilities = [
  {
    icon: Inbox,
    title: "Inbox da equipe",
    description: "Várias pessoas atendem no mesmo número, com responsável e histórico da conversa.",
  },
  {
    icon: Bot,
    title: "Automação no repetitivo",
    description:
      "Dúvidas frequentes, status e triagem seguem um fluxo. Quando a conversa pede uma pessoa, o handoff leva o contexto.",
  },
  {
    icon: ListOrdered,
    title: "Fila visível",
    description: "A equipe vê o que está aguardando, em atendimento ou encerrado.",
  },
  {
    icon: Plug,
    title: "WhatsApp Cloud API oficial",
    description: "Webhooks e API oficial da Meta. Não é número espelhado nem sessão presa a um celular.",
  },
];

export function WhatsAppProductSection() {
  return (
    <section
      id="capacidades"
      className="border-y df-border-brand bg-[var(--devflow-surface)] py-12 sm:py-16 lg:py-20"
      aria-labelledby="whatsapp-product-heading"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-primary" aria-hidden />
          <h2
            id="whatsapp-product-heading"
            className="df-text-primary text-2xl font-bold tracking-tight sm:text-3xl"
          >
            O que entra na operação
          </h2>
          <p className="df-text-secondary mt-4 text-base leading-relaxed sm:text-lg">
            Capacidades da WhatsApp Platform. O desenho de cada fluxo sai do diagnóstico, não de um pacote genérico.
          </p>
        </div>

        <ul className="mt-10 grid gap-6 sm:grid-cols-2" role="list">
          {capabilities.map((item) => (
            <li key={item.title} className="df-surface-elevated rounded-2xl p-6">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/12">
                <item.icon className="size-4 text-primary" aria-hidden />
              </div>
              <h3 className="df-text-primary mt-3 text-base font-bold">{item.title}</h3>
              <p className="df-text-secondary mt-2 text-sm leading-relaxed">{item.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
