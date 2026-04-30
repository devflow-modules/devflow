import { Check, X } from "lucide-react";
import { WhatsAppCta } from "@/components/shared/whatsapp-cta";
import { cn } from "@/lib/utils";

const quandoSim = [
  "Recebe muitas mensagens por dia",
  "Demora para responder",
  "Perde lead fora do horário",
  "Quer filtrar atendimento humano",
  "Precisa padronizar resposta",
];

const quandoNao = [
  "Baixo volume de mensagens",
  "Operação totalmente manual e pequena",
  "Sem equipe para assumir handoff",
];

export function QuandoFazSentido() {
  return (
    <section
      id="quando-faz-sentido"
      className="py-24 bg-muted/30"
      aria-labelledby="quando-heading"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            id="quando-heading"
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Quando faz sentido contratar
          </h2>
          <p className="mt-3 df-text-secondary">
            Reconheça seu cenário. A honestidade aumenta credibilidade.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-3xl gap-8 sm:grid-cols-2">
          <div className="rounded-xl border border-primary/30 bg-card p-6">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Check className="size-5 text-primary" />
              Faz sentido
            </h3>
            <ul className="mt-4 space-y-2" role="list">
              {quandoSim.map((item) => (
                <li key={item} className="text-sm df-text-secondary">
                  • {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <X className="size-5 text-muted-foreground" />
              Não faz sentido
            </h3>
            <ul className="mt-4 space-y-2" role="list">
              {quandoNao.map((item) => (
                <li key={item} className="text-sm df-text-secondary">
                  • {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
