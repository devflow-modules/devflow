"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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

export function SimuladorRapidoFinanceiro() {
  const [receita, setReceita] = useState<string>("6500");
  const [fixas, setFixas] = useState<string>("3500");
  const [variaveis, setVariaveis] = useState<string>("1750");

  const resultado = useMemo(() => {
    const rec = parseInputNumber(receita);
    const fix = parseInputNumber(fixas);
    const var_ = parseInputNumber(variaveis);

    if (rec === 0 && fix === 0 && var_ === 0) return null;

    const totalDespesas = fix + var_;
    const saldo = rec - totalDespesas;
    const percentual = rec > 0 ? (totalDespesas / rec) * 100 : 0;

    return {
      saldo,
      projecao12: saldo * 12,
      percentual,
      positivo: saldo >= 0,
    };
  }, [receita, fixas, variaveis]);

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
      aria-labelledby="simulador-heading"
    >
      <h2 id="simulador-heading" className="text-xl font-semibold text-foreground sm:text-2xl">
        Simule seu fluxo mensal
      </h2>
      <p className={cn("mt-1 text-sm", mutedTextLight)}>
        Preencha os valores e veja o saldo projetado. Sem cadastro.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <label className="space-y-1">
          <span className={cn(labelCapsSm, mutedTextLight)}>Receita mensal (R$)</span>
          <input
            type="text"
            inputMode="decimal"
            value={receita}
            onChange={(e) => setReceita(e.target.value.replace(/[^\d.,\s]/g, ""))}
            placeholder="ex.: 6500"
            className={inputClass}
            aria-label="Receita mensal em reais"
          />
        </label>
        <label className="space-y-1">
          <span className={cn(labelCapsSm, mutedTextLight)}>Despesas fixas (R$)</span>
          <input
            type="text"
            inputMode="decimal"
            value={fixas}
            onChange={(e) => setFixas(e.target.value.replace(/[^\d.,\s]/g, ""))}
            placeholder="ex.: 3500"
            className={inputClass}
            aria-label="Despesas fixas em reais"
          />
        </label>
        <label className="space-y-1">
          <span className={cn(labelCapsSm, mutedTextLight)}>Despesas variáveis (R$)</span>
          <input
            type="text"
            inputMode="decimal"
            value={variaveis}
            onChange={(e) => setVariaveis(e.target.value.replace(/[^\d.,\s]/g, ""))}
            placeholder="ex.: 1750"
            className={inputClass}
            aria-label="Despesas variáveis em reais"
          />
        </label>
      </div>

      {resultado && (
        <>
          <div
            className={cn(
              "mt-6 rounded-xl border p-5",
              resultado.positivo
                ? "border-emerald-200 bg-emerald-50/80 dark:border-emerald-800 dark:bg-emerald-950/30"
                : "border-amber-200 bg-amber-50/80 dark:border-amber-800 dark:bg-amber-950/30"
            )}
            role="status"
            aria-live="polite"
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className={cn(labelCapsSm, mutedTextLight)}>Saldo mensal</p>
                <p
                  className={cn(
                    "mt-1 text-2xl font-semibold",
                    resultado.positivo ? "text-emerald-800 dark:text-emerald-200" : "text-amber-800 dark:text-amber-200"
                  )}
                >
                  {formatCurrency(resultado.saldo)}
                </p>
              </div>
              <div>
                <p className={cn(labelCapsSm, mutedTextLight)}>Comprometimento da renda</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">
                  {resultado.percentual.toFixed(0)}%
                </p>
              </div>
              <div>
                <p className={cn(labelCapsSm, mutedTextLight)}>Projeção anual</p>
                <p
                  className={cn(
                    "mt-1 text-2xl font-semibold",
                    resultado.positivo ? "text-emerald-800 dark:text-emerald-200" : "text-amber-800 dark:text-amber-200"
                  )}
                >
                  {formatCurrency(resultado.projecao12)}
                </p>
              </div>
            </div>
            {resultado.positivo ? (
              <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-300">
                Margem positiva — sobra para guardar ou investir.
              </p>
            ) : (
              <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">
                Atenção: saldo negativo. Vale revisar despesas ou receitas.
              </p>
            )}
          </div>

          <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <p className="text-sm font-medium text-foreground">
              Crie sua casa financeira para acompanhar automaticamente
            </p>
            <Link
              href="/ferramentas/financeiro/auth"
              className="mt-3 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Criar conta grátis
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
