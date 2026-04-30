"use client";

import { useState } from "react";
import { cn } from "@/modules/financeiro/lib/cn";
import { Button } from "@/components/ui/button";
import { DividirContasTool } from "@/modules/financeiro/components/DividirContasTool";
import { ProjecaoFinanceiraTool } from "@/modules/financeiro/components/ProjecaoFinanceiraTool";
import { DespesasFixasTool } from "@/modules/financeiro/components/DespesasFixasTool";

const TABS = [
  { id: "divisao", label: "Divisão de contas", Tool: DividirContasTool },
  { id: "projecao", label: "Projeção mensal", Tool: ProjecaoFinanceiraTool },
  { id: "fixas", label: "Despesas fixas", Tool: DespesasFixasTool },
] as const;

export function FinanceiroTools() {
  const [active, setActive] = useState<(typeof TABS)[number]["id"]>("divisao");
  const activeTab = TABS.find((t) => t.id === active) ?? TABS[0];
  const ActiveTool = activeTab.Tool;

  return (
    <div className="mt-6">
      <div
        role="tablist"
        aria-label="Selecione a ferramenta"
        className="flex flex-wrap gap-2 border-b border-border pb-4"
      >
        {TABS.map((tab) => (
          <Button
            key={tab.id}
            type="button"
            role="tab"
            variant={active === tab.id ? "primary" : "secondary"}
            aria-selected={active === tab.id}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            onClick={() => setActive(tab.id)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium shadow-none transition",
              active === tab.id ? "" : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {tab.label}
          </Button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`panel-${activeTab.id}`}
        aria-labelledby={`tab-${activeTab.id}`}
        className="mt-6"
      >
        <ActiveTool />
      </div>
    </div>
  );
}
