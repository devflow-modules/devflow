import { MessageCircle, Cpu, Zap, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const stack = [
  { icon: MessageCircle, label: "WhatsApp Cloud API" },
  { icon: Cpu, label: "IA" },
  { icon: Zap, label: "Node.js" },
  { icon: Shield, label: "Automação" },
];

export function TechStack() {
  return (
    <section
      id="tecnologia"
      className="py-24 bg-muted/30"
      aria-labelledby="tech-heading"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            id="tech-heading"
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Tecnologia
          </h2>
          <p className="mt-3 df-text-secondary">
            Stack técnica que garante credibilidade e performance.
          </p>
        </div>

        <div className="mx-auto mt-12 flex max-w-2xl flex-wrap justify-center gap-4">
          {stack.map((item) => (
            <div
              key={item.label}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3",
                "transition-all duration-200 hover:border-primary/30 hover:shadow-md"
              )}
            >
              <item.icon className="size-5 text-primary" aria-hidden />
              <span className="font-medium text-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
