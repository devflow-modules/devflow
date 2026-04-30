"use client";

import { UtensilsCrossed, Flame, Store } from "lucide-react";
import { DEMO_SCENARIOS, type DemoScenarioId } from "@/modules/demo";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const ICONS: Record<DemoScenarioId, typeof UtensilsCrossed> = {
  restaurante: UtensilsCrossed,
  tabacaria: Flame,
  loja: Store,
};

type Props = {
  onSelect: (id: DemoScenarioId) => void;
  disabled?: boolean;
};

export function DemoScenarioPicker({ onSelect, disabled }: Props) {
  const ids: DemoScenarioId[] = ["restaurante", "tabacaria", "loja"];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {ids.map((id) => {
        const s = DEMO_SCENARIOS[id];
        const Icon = ICONS[id];
        return (
          <Button
            key={id}
            type="button"
            variant="secondary"
            disabled={disabled}
            onClick={() => onSelect(id)}
            className={cn(
              "h-auto min-h-0 w-full flex-col items-start justify-start rounded-xl border border-border bg-card p-5 text-left font-normal shadow-sm transition-all",
              "hover:border-primary/40 hover:bg-primary/[0.03] hover:brightness-100",
              "focus-visible:ring-2 focus-visible:ring-primary/50",
              disabled && "opacity-60"
            )}
          >
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="size-5" aria-hidden />
            </span>
            <span className="mt-3 font-semibold text-foreground">{s.label}</span>
            <span className="mt-1 text-sm text-muted-foreground">{s.description}</span>
            <span className="mt-3 text-xs font-medium text-primary">Iniciar roteiro →</span>
          </Button>
        );
      })}
    </div>
  );
}
