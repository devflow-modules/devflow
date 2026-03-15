"use client";

import { useMemo, useState } from "react";
import { cn } from "@/modules/financeiro/lib/cn";
import {
  cardStaticLight,
  focusRingLight,
  labelCapsSm,
  mutedTextLight,
} from "@/modules/financeiro/lib/primitives";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function parseInputNumber(raw: string): number {
  const cleaned = raw.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number.parseFloat(cleaned);
  return Number.isNaN(n) ? 0 : n;
}

type Status = "saudavel" | "atencao" | "alerta";

function getStatus(pct: number): Status {
  if (pct <= 50) return "saudavel";
  if (pct <= 70) return "atencao";
  return "alerta";
}

function getStatusMessage(status: Status): string {
  switch (status) {
    case "saudavel":
      return "Situação saudável. Sobra margem para guardar ou investir.";
    case "atencao":
      return "Atenção. Vale revisar despesas fixas ou pensar em aumentar a renda.";
    case "alerta":
      return "Alerta. Renda muito comprometida. Priorize cortes ou aumento de renda.";
    default:
      return "";
  }
}

export function DespesasFixasTool() {
  const [renda, setRenda] = useState<string>("7200");
  const [fixas, setFixas] = useState<string>("3600");

  const resultado = useMemo(() => {
    const r = parseInputNumber(renda);
    const f = parseInputNumber(fixas);

    if (r <= 0 || f <= 0) return null;

    const pct = Math.round((f / r) * 100);
    const restante = Math.round(r - f);
    const status = getStatus(pct);

    return {
      pct,
      restante,
      status,
      mensagem: getStatusMessage(status),
    };
  }, [renda, fixas]);

  const inputClass = cn(
    "w-full rounded-xl border border-border bg-card px-4 py-3 text-foreground transition",
    "placeholder:text-muted-foreground",
    "focus:border-primary focus:ring-2 focus:ring-primary/20",
    focusRingLight
  );

  return (
    <div
      className={cn(cardStaticLight, "p-6 sm:p-8")}
      role="region"
      aria-labelledby="tool-heading"
    >
      <h2 id="tool-heading" className="sr-only">
        Calcular percentual de despesas fixas
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1">
          <span className={cn(labelCapsSm, mutedTextLight)}>
            Renda mensal (R$)
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={renda}
            onChange={(e) =>
              setRenda(e.target.value.replace(/[^\d.,\s]/g, ""))
            }
            placeholder="ex.: 7200"
            className={inputClass}
            aria-label="Renda mensal em reais"
          />
        </label>
        <label className="space-y-1">
          <span className={cn(labelCapsSm, mutedTextLight)}>
            Total de despesas fixas (R$)
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={fixas}
            onChange={(e) =>
              setFixas(e.target.value.replace(/[^\d.,\s]/g, ""))
            }
            placeholder="ex.: 3600"
            className={inputClass}
            aria-label="Total de despesas fixas em reais"
          />
        </label>
      </div>

      {resultado && (
        <div
          className={cn(
            "mt-6 rounded-xl border p-5",
            resultado.status === "saudavel" &&
              "border-emerald-200 bg-emerald-50/80",
            resultado.status === "atencao" &&
              "border-amber-200 bg-amber-50/80",
            resultado.status === "alerta" && "border-rose-200 bg-rose-50/80"
          )}
          role="status"
          aria-live="polite"
        >
          <p className={cn(labelCapsSm, mutedTextLight)}>
            Renda comprometida com fixos
          </p>
          <p
            className={cn(
              "mt-2 text-2xl font-semibold",
              resultado.status === "saudavel" && "text-emerald-800",
              resultado.status === "atencao" && "text-amber-800",
              resultado.status === "alerta" && "text-rose-800"
            )}
          >
            {resultado.pct}%
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Valor restante após as fixas:{" "}
            <span className="font-semibold text-foreground">
              {formatCurrency(resultado.restante)}
            </span>
          </p>
          <p
            className={cn(
              "mt-2 text-sm",
              resultado.status === "saudavel" && "text-emerald-700",
              resultado.status === "atencao" && "text-amber-700",
              resultado.status === "alerta" && "text-rose-700"
            )}
          >
            {resultado.mensagem}
          </p>
        </div>
      )}
    </div>
  );
}
