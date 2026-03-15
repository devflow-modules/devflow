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

export function ProjecaoFinanceiraTool() {
  const [saldoAtual, setSaldoAtual] = useState<string>("1800");
  const [entradas, setEntradas] = useState<string>("6500");
  const [despesas, setDespesas] = useState<string>("5200");

  const resultado = useMemo(() => {
    const saldo = parseInputNumber(saldoAtual);
    const ent = parseInputNumber(entradas);
    const desp = parseInputNumber(despesas);

    if (saldo === 0 && ent === 0 && desp === 0) return null;

    const projetado = saldo + ent - desp;

    return {
      projetado: Math.round(projetado),
      positivo: projetado >= 0,
    };
  }, [saldoAtual, entradas, despesas]);

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
        Calcular projeção financeira mensal
      </h2>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="space-y-1">
          <span className={cn(labelCapsSm, mutedTextLight)}>
            Saldo atual (R$)
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={saldoAtual}
            onChange={(e) =>
              setSaldoAtual(e.target.value.replace(/[^\d.,\s]/g, ""))
            }
            placeholder="ex.: 1800"
            className={inputClass}
            aria-label="Saldo atual em reais"
          />
        </label>
        <label className="space-y-1">
          <span className={cn(labelCapsSm, mutedTextLight)}>
            Entradas previstas no mês (R$)
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={entradas}
            onChange={(e) =>
              setEntradas(e.target.value.replace(/[^\d.,\s]/g, ""))
            }
            placeholder="ex.: 6500"
            className={inputClass}
            aria-label="Entradas previstas no mês em reais"
          />
        </label>
        <label className="space-y-1">
          <span className={cn(labelCapsSm, mutedTextLight)}>
            Despesas previstas no mês (R$)
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={despesas}
            onChange={(e) =>
              setDespesas(e.target.value.replace(/[^\d.,\s]/g, ""))
            }
            placeholder="ex.: 5200"
            className={inputClass}
            aria-label="Despesas previstas no mês em reais"
          />
        </label>
      </div>

      {resultado && (
        <div
          className={cn(
            "mt-6 rounded-xl border p-5",
            resultado.positivo
              ? "border-emerald-200 bg-emerald-50/80"
              : "border-amber-200 bg-amber-50/80"
          )}
          role="status"
          aria-live="polite"
        >
          <p className={cn(labelCapsSm, mutedTextLight)}>
            Saldo projetado ao final do mês
          </p>
          <p
            className={cn(
              "mt-2 text-2xl font-semibold",
              resultado.positivo ? "text-emerald-800" : "text-amber-800"
            )}
          >
            {formatCurrency(resultado.projetado)}
          </p>
          {resultado.positivo ? (
            <p className="mt-2 text-sm text-emerald-700">
              Margem positiva — sobra para guardar ou investir.
            </p>
          ) : (
            <p className="mt-2 text-sm text-amber-700">
              Atenção: saldo negativo. Vale revisar despesas ou entradas.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
