"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/financeiro/cn";
import {
  cardStaticLight,
  focusRingLight,
  labelCapsSm,
  mutedTextLight,
} from "@/lib/financeiro/primitives";

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

export function DividirContasTool() {
  const [renda1, setRenda1] = useState<string>("5000");
  const [renda2, setRenda2] = useState<string>("3500");
  const [totalDespesas, setTotalDespesas] = useState<string>("4200");

  const resultado = useMemo(() => {
    const r1 = parseInputNumber(renda1);
    const r2 = parseInputNumber(renda2);
    const total = parseInputNumber(totalDespesas);

    if (r1 <= 0 || r2 <= 0 || total <= 0) return null;

    const somaRendas = r1 + r2;
    const pessoa1 = Math.round((r1 / somaRendas) * total);
    const pessoa2 = total - pessoa1;

    return {
      pessoa1,
      pessoa2,
      total,
    };
  }, [renda1, renda2, totalDespesas]);

  const handleRenda1 = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRenda1(e.target.value.replace(/[^\d.,\s]/g, ""));
  };
  const handleRenda2 = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRenda2(e.target.value.replace(/[^\d.,\s]/g, ""));
  };
  const handleDespesas = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTotalDespesas(e.target.value.replace(/[^\d.,\s]/g, ""));
  };

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
        Calcular divisão proporcional
      </h2>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="space-y-1">
          <span className={cn(labelCapsSm, mutedTextLight)}>
            Renda pessoa 1 (R$)
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={renda1}
            onChange={handleRenda1}
            placeholder="ex.: 5000"
            className={inputClass}
            aria-label="Renda da pessoa 1 em reais"
          />
        </label>
        <label className="space-y-1">
          <span className={cn(labelCapsSm, mutedTextLight)}>
            Renda pessoa 2 (R$)
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={renda2}
            onChange={handleRenda2}
            placeholder="ex.: 3500"
            className={inputClass}
            aria-label="Renda da pessoa 2 em reais"
          />
        </label>
        <label className="space-y-1">
          <span className={cn(labelCapsSm, mutedTextLight)}>
            Total das despesas (R$)
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={totalDespesas}
            onChange={handleDespesas}
            placeholder="ex.: 4200"
            className={inputClass}
            aria-label="Total das despesas em reais"
          />
        </label>
      </div>

      {resultado && (
        <div
          className="mt-6 rounded-xl border border-border bg-muted/30 p-5"
          role="status"
          aria-live="polite"
        >
          <p className={cn(labelCapsSm, mutedTextLight)}>
            Divisão proporcional
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Pessoa 1 paga</p>
              <p className="text-xl font-semibold text-foreground">
                {formatCurrency(resultado.pessoa1)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pessoa 2 paga</p>
              <p className="text-xl font-semibold text-foreground">
                {formatCurrency(resultado.pessoa2)}
              </p>
            </div>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Total: {formatCurrency(resultado.total)}
          </p>
        </div>
      )}
    </div>
  );
}
