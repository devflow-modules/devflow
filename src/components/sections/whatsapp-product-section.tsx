import { Inbox, UserRound, ListOrdered, ArrowRightLeft, History, Bot, Plug } from "lucide-react";

const capabilities = [
  { icon: Inbox, title: "Inbox da equipe", detail: "Várias pessoas no mesmo atendimento" },
  { icon: UserRound, title: "Responsável visível", detail: "Quem está cuidando de cada cliente" },
  { icon: ListOrdered, title: "Filas", detail: "Comercial, suporte ou o que a operação definir" },
  { icon: ArrowRightLeft, title: "Passagem entre pessoas", detail: "Com o histórico da conversa" },
  { icon: History, title: "Histórico compartilhado", detail: "Contexto que não fica só no celular" },
  { icon: Bot, title: "IA no repetitivo", detail: "Só o que a operação liberar" },
  { icon: Plug, title: "API oficial da Meta", detail: "WhatsApp Cloud API" },
] as const;

export function WhatsAppProductSection() {
  return (
    <section id="capacidades" className="df-v2-section" aria-labelledby="whatsapp-product-heading">
      <div className="df-v2-container">
        <h2 id="whatsapp-product-heading" className="df-v2-h2 max-w-[18ch]">
          O que a plataforma coloca na operação
        </h2>
        <p className="df-v2-lead mt-4 max-w-2xl">
          Recursos da WhatsApp Platform. O desenho de cada fila e fluxo sai do diagnóstico — não de um pacote genérico.
        </p>
        <ul className="mt-10 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3" role="list">
          {capabilities.map((item) => (
            <li key={item.title} className="flex items-start gap-3 border-t border-[var(--df-v2-border)] py-4">
              <item.icon className="mt-0.5 size-4 shrink-0 text-[var(--df-v2-brand)]" aria-hidden />
              <span>
                <span className="block text-base font-semibold text-[var(--df-v2-ink)]">{item.title}</span>
                <span className="mt-0.5 block text-sm text-[var(--df-v2-ink-soft)]">{item.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
