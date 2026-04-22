import { BriefcaseBusiness, GraduationCap, HeartPulse, Headset, ShoppingBag, Wrench } from "lucide-react";
import { Section } from "@/components/layout/Section";

const useCases = [
  {
    icon: Headset,
    segment: "Suporte",
    result: "Resposta imediata no óbvio. Humano só no caso que queima.",
  },
  {
    icon: ShoppingBag,
    segment: "Vendas",
    result: "Deal quente no topo. Follow-up não morre no esquecimento.",
  },
  {
    icon: HeartPulse,
    segment: "Clínicas",
    result: "Confirmação e triagem no automático. Recepção respira.",
  },
  {
    icon: Wrench,
    segment: "Serviços",
    result: "Pico vira fila organizada — não tumulto no WhatsApp.",
  },
  {
    icon: GraduationCap,
    segment: "Infoprodutos",
    result: "Lançamento aguenta volume sem queimar time nem lead.",
  },
  {
    icon: BriefcaseBusiness,
    segment: "Agências",
    result: "Multi-conta com padrão. Cliente vê performance, não improviso.",
  },
];

export function UseCasesSection() {
  return (
    <Section aria-labelledby="use-cases-section-heading" className="py-20 sm:py-24">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary/90 sm:text-sm">Onde dói mais</p>
        <h2
          id="use-cases-section-heading"
          className="mt-3 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
        >
          Mesma plataforma. Cenários diferentes. Mesmo ganho: velocidade + controle
        </h2>
      </div>

      <div className="mx-auto mt-12 grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {useCases.map((item) => (
          <article
            key={item.segment}
            className="rounded-2xl border border-border bg-card p-6 shadow-[0_12px_40px_-18px_rgba(15,23,42,0.1)]"
          >
            <div className="flex size-9 items-center justify-center rounded-xl bg-sky-500/10">
              <item.icon className="size-4 text-sky-700" aria-hidden />
            </div>
            <h3 className="mt-5 text-base font-bold tracking-tight text-foreground">{item.segment}</h3>
            <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{item.result}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}
