import { MessageSquare, Settings, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";

const passos = [
  {
    icon: MessageSquare,
    numero: "1",
    title: "Entendemos seu atendimento",
    description: "Mapeamos as perguntas que mais chegam e como sua equipe responde hoje.",
  },
  {
    icon: Settings,
    numero: "2",
    title: "Configuramos o fluxo",
    description: "Montamos as respostas automáticas e o handoff para humanos.",
  },
  {
    icon: Rocket,
    numero: "3",
    title: "Você começa a receber leads",
    description: "Resposta automática 24/7. Sua equipe foca no que importa.",
  },
];

export function Processo3Passos() {
  return (
    <section
      id="processo"
      className="py-24 bg-muted/30"
      aria-labelledby="processo-heading"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            id="processo-heading"
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Como começamos
          </h2>
          <p className="mt-3 df-text-secondary">
            Três passos simples. Reduz a sensação de complexidade.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-8 sm:grid-cols-3">
          {passos.map((passo) => (
            <article
              key={passo.numero}
              className="relative rounded-xl border border-border bg-card p-6"
            >
              <div className="flex size-12 items-center justify-center rounded-full border-2 border-primary bg-primary/10">
                <span className="text-lg font-bold text-primary">{passo.numero}</span>
              </div>
              <h3 className="mt-4 font-medium text-foreground">{passo.title}</h3>
              <p className="mt-2 text-sm df-text-secondary">{passo.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
