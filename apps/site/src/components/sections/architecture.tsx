import { ArrowDown, MessageCircle, Cpu, UserRound, BarChart3, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const layers = [
  { icon: MessageCircle, label: "API WhatsApp" },
  { icon: Cpu, label: "DevFlow Platform" },
  { icon: Cpu, label: "IA + Automação" },
  { icon: UserRound, label: "Atendimento humano" },
];

const components = [
  "Sistema de handoff humano",
  "IA de atendimento",
  "Painel de métricas",
  "Logs operacionais",
];

export function Architecture() {
  return (
    <section
      id="arquitetura"
      className="py-24"
      aria-labelledby="architecture-heading"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div
            className="mx-auto mb-4 h-1 w-12 rounded-full bg-primary"
            aria-hidden
          />
          <h2
            id="architecture-heading"
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Infraestrutura DevFlow
          </h2>
          <p className="mt-3 df-text-secondary">
            Engenharia real. Não é só chatbot, é plataforma.
          </p>
        </div>

        <div className="mx-auto mt-12 flex max-w-md flex-col items-center gap-0">
          {layers.map((layer, i) => (
            <div key={layer.label} className="flex flex-col items-center">
              <div
                className={cn(
                  "flex items-center gap-3 rounded-xl border border-border bg-card px-6 py-4",
                  "w-full max-w-xs transition-all duration-200 hover:shadow-lg",
                  i === 0 && "border-accent/30 bg-accent/5"
                )}
              >
                <layer.icon className="size-5 shrink-0 text-accent" />
                <span className="font-medium text-foreground">{layer.label}</span>
              </div>
              {i < layers.length - 1 && (
                <ArrowDown className="my-1 size-5 df-text-muted" />
              )}
            </div>
          ))}
        </div>

        <div className="mx-auto mt-12 flex max-w-2xl flex-wrap justify-center gap-3">
          {components.map((comp) => (
            <span
              key={comp}
              className="inline-flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/5 px-4 py-2 text-sm font-medium df-text-secondary"
            >
              <FileText className="size-4 text-accent" />
              {comp}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
