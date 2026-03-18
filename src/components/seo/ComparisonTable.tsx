import { Check, Minus, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const ROWS: {
  label: string;
  planilha: "yes" | "partial" | "no";
  appComum: "yes" | "partial" | "no";
  devflow: "yes" | "partial" | "no";
  note?: { planilha?: string; appComum?: string; devflow?: string };
}[] = [
  {
    label: "Registro rápido no dia a dia",
    planilha: "partial",
    appComum: "yes",
    devflow: "yes",
  },
  {
    label: "Recorrências e vencimentos automáticos",
    planilha: "partial",
    appComum: "partial",
    devflow: "yes",
  },
  {
    label: "Separar pessoa física e empresa (PJ)",
    planilha: "partial",
    appComum: "no",
    devflow: "yes",
  },
  {
    label: "Visão casal / household compartilhado",
    planilha: "partial",
    appComum: "partial",
    devflow: "yes",
  },
  {
    label: "Orçamento vs real por categoria",
    planilha: "yes",
    appComum: "partial",
    devflow: "yes",
  },
  {
    label: "Curva de aprendizado baixa",
    planilha: "partial",
    appComum: "yes",
    devflow: "yes",
    note: {
      planilha: "Depende do template",
      appComum: "Varia por app",
    },
  },
  {
    label: "Custo zero para começar",
    planilha: "yes",
    appComum: "partial",
    devflow: "yes",
  },
  {
    label: "Exportação / portabilidade dos dados",
    planilha: "yes",
    appComum: "partial",
    devflow: "partial",
  },
];

function Cell({
  level,
  label,
}: {
  level: "yes" | "partial" | "no";
  label?: string;
}) {
  if (level === "yes") {
    return (
      <span className="inline-flex items-center justify-center gap-1 text-emerald-600">
        <Check className="size-4 shrink-0" aria-hidden />
        <span className="sr-only">Sim</span>
      </span>
    );
  }
  if (level === "partial") {
    return (
      <span
        className="inline-flex items-center justify-center gap-1 text-amber-600"
        title={label}
      >
        <AlertCircle className="size-4 shrink-0" aria-hidden />
        <span className="sr-only">Parcial</span>
      </span>
    );
  }
  return (
    <span className="inline-flex justify-center text-muted-foreground">
      <Minus className="size-4" aria-hidden />
      <span className="sr-only">Não</span>
    </span>
  );
}

export function ComparisonTable() {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border shadow-sm">
      <table className="w-full min-w-[520px] border-collapse text-sm">
        <caption className="sr-only">
          Comparação entre planilha, aplicativo financeiro comum e DevFlow Labs
        </caption>
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-4 py-3 text-left font-semibold text-foreground">
              Critério
            </th>
            <th className="px-3 py-3 text-center font-semibold text-foreground">
              Planilha
            </th>
            <th className="px-3 py-3 text-center font-semibold text-foreground">
              App comum
            </th>
            <th className="px-3 py-3 text-center font-semibold text-primary">
              DevFlow
            </th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row, i) => (
            <tr
              key={row.label}
              className={cn(
                "border-b border-border",
                i % 2 === 0 ? "bg-card" : "bg-muted/20"
              )}
            >
              <td className="px-4 py-3 font-medium text-foreground">
                {row.label}
              </td>
              <td className="px-3 py-3 text-center">
                <Cell level={row.planilha} label={row.note?.planilha} />
              </td>
              <td className="px-3 py-3 text-center">
                <Cell level={row.appComum} label={row.note?.appComum} />
              </td>
              <td className="bg-primary/5 px-3 py-3 text-center">
                <Cell level={row.devflow} label={row.note?.devflow} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
        Legenda: ✓ forte no critério · ⚠ parcial ou depende de setup · — limitado.
        &quot;App comum&quot; = média de apps de finanças pessoais genéricos.
      </p>
    </div>
  );
}
