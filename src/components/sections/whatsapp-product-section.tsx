import { Inbox, UserRound, ListOrdered, ArrowRightLeft, History, Bot, Plug } from "lucide-react";

const capabilities = [
  { icon: Inbox, title: "Inbox compartilhada" },
  { icon: UserRound, title: "Responsáveis" },
  { icon: ListOrdered, title: "Filas" },
  { icon: ArrowRightLeft, title: "Handoff" },
  { icon: History, title: "Histórico" },
  { icon: Bot, title: "IA supervisionada" },
  { icon: Plug, title: "API oficial" },
] as const;

export function WhatsAppProductSection() {
  return (
    <section id="capacidades" className="df-v2-section" aria-labelledby="whatsapp-product-heading">
      <div className="df-v2-container">
        <h2 id="whatsapp-product-heading" className="df-v2-h2 max-w-[16ch]">
          O que entra na operação
        </h2>
        <p className="df-v2-lead mt-4 max-w-2xl">
          Capacidades da WhatsApp Platform. O desenho de cada fluxo sai do diagnóstico, não de um pacote genérico.
        </p>
        <ul className="mt-10 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3" role="list">
          {capabilities.map((item) => (
            <li key={item.title} className="flex items-center gap-3 border-t border-[var(--df-v2-border)] py-4">
              <item.icon className="size-4 text-[var(--df-v2-brand)]" aria-hidden />
              <span className="text-base font-semibold text-[var(--df-v2-ink)]">{item.title}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
