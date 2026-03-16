import Link from "next/link";
import { WhatsAppCta } from "@/components/shared/whatsapp-cta";
import { cn } from "@/lib/utils";

const segments = [
  {
    title: "Restaurantes",
    description: "Automatize pedidos, horários e entrega.",
    href: "/automacao-whatsapp-restaurante",
  },
  {
    title: "Tabacarias",
    description: "Respostas rápidas sobre produtos e pedidos.",
    href: "/automacao-whatsapp-tabacaria",
  },
  {
    title: "Lojas",
    description: "Produtos, preços e estoque automatizados.",
    href: "/automacao-whatsapp-loja",
  },
  {
    title: "Clínicas",
    description: "Agendamentos, confirmações e convênios.",
    href: "/automacao-whatsapp-clinica",
  },
];

export function ForWho() {
  return (
    <section
      id="para-quem"
      className="py-24"
      aria-labelledby="for-who-heading"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div
            className="mx-auto mb-4 h-1 w-12 rounded-full bg-primary"
            aria-hidden
          />
          <h2
            id="for-who-heading"
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Para quem é a DevFlow
          </h2>
          <p className="mt-3 text-slate-600">
            Se você se identifica com um desses perfis, a DevFlow foi feita para você.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {segments.map((segment) => (
            <Link
              key={segment.title}
              href={segment.href}
              className={cn(
                "block rounded-xl border border-border bg-card p-6",
                "transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
              )}
            >
              <h3 className="font-semibold text-foreground">{segment.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{segment.description}</p>
            </Link>
          ))}
        </div>
        <div className="mx-auto mt-12 max-w-md text-center">
          <WhatsAppCta
            label="Quero ver no meu negócio"
            size="default"
            text="Olá, quero saber como a automação funciona para o meu tipo de negócio."
          />
        </div>
      </div>
    </section>
  );
}
