import { BriefcaseBusiness, GraduationCap, HeartPulse, Headset, ShoppingBag, Wrench } from "lucide-react";
import { Section } from "@/components/layout/Section";

const useCases = [
  {
    icon: Headset,
    segment: "Suporte",
    result: "Dúvidas repetidas podem ser automatizadas. O restante segue para a equipe, com histórico.",
  },
  {
    icon: ShoppingBag,
    segment: "Vendas",
    result: "A conversa fica com um responsável e pode ser transferida sem perder o contexto.",
  },
  {
    icon: HeartPulse,
    segment: "Clínicas",
    result: "Informação e encaminhamento. A equipe assume quando a conversa exige contexto.",
  },
  {
    icon: Wrench,
    segment: "Serviços",
    result: "A fila mostra o que ainda precisa de resposta, em vez de mensagens soltas no celular.",
  },
  {
    icon: GraduationCap,
    segment: "Infoprodutos",
    result: "A equipe vê quem está com cada conversa e o que ainda está aguardando.",
  },
  {
    icon: BriefcaseBusiness,
    segment: "Equipes",
    result: "Mais de uma pessoa atende, com papéis de operação e gestão na implantação acompanhada.",
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
          O mesmo tipo de operação, em contextos diferentes
        </h2>
      </div>

      <div className="mx-auto mt-12 grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {useCases.map((item) => (
          <article
            key={item.segment}
            className="rounded-2xl border border-border bg-card p-6 shadow-[0_12px_40px_-18px_rgba(15,23,42,0.1)]"
          >
            <div className="flex size-9 items-center justify-center rounded-xl df-bg-info-soft">
              <item.icon className="size-4 df-status-info" aria-hidden />
            </div>
            <h3 className="mt-5 text-base font-bold tracking-tight text-foreground">{item.segment}</h3>
            <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{item.result}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}
