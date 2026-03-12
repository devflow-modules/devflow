import { X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const antes = [
  "Demora para responder",
  "Mensagens perdidas",
  "Atendimento manual o tempo todo",
];

const depois = [
  "Resposta imediata",
  "Qualificação automática",
  "Encaminhamento inteligente",
];

export function AntesDepois() {
  return (
    <section
      id="antes-depois"
      className="py-24 bg-muted/30"
      aria-labelledby="antes-depois-heading"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            id="antes-depois-heading"
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Antes vs Depois
          </h2>
          <p className="mt-3 text-slate-600">
            A transformação que a automação traz para o atendimento.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-3xl gap-8 sm:grid-cols-2">
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6">
            <h3 className="font-semibold text-foreground">Antes</h3>
            <ul className="mt-4 space-y-3" role="list">
              {antes.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-3 text-sm text-slate-700"
                >
                  <X className="size-4 shrink-0 text-destructive" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-6">
            <h3 className="font-semibold text-foreground">Depois</h3>
            <ul className="mt-4 space-y-3" role="list">
              {depois.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-3 text-sm text-slate-700"
                >
                  <Check className="size-4 shrink-0 text-primary" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
