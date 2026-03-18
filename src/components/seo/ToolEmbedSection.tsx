import Link from "next/link";
import { ArrowRight, Calculator, Building2, Check } from "lucide-react";
import type { SeoPage } from "@/lib/seo/types";
import { cn } from "@/lib/utils";

const DIVISAO_BULLETS = [
  "Rateio igual ou proporcional à renda",
  "Vários participantes e despesas",
  "Resultado na hora, sem planilha",
];

const CNPJ_BULLETS = [
  "Situação cadastral e razão social",
  "Dados da base pública da Receita",
  "Consulta rápida no navegador",
];

type Props = {
  page: SeoPage;
};

export function ToolEmbedSection({ page }: Props) {
  const isDivisao = page.tool === "divisao";

  return (
    <section
      className="py-12 sm:py-16"
      aria-labelledby="tool-embed-heading"
    >
      <div className="mx-auto max-w-[720px]">
        <h2 id="tool-embed-heading" className="sr-only">
          {isDivisao ? "Ferramenta de divisão de contas" : "Ferramenta de consulta CNPJ"}
        </h2>

        <div
          className={cn(
            "overflow-hidden rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-white to-slate-50",
            "shadow-[0_20px_60px_rgba(0,0,0,0.06)]"
          )}
        >
          <div className="border-b border-border bg-primary/5 px-6 py-4 sm:px-8">
            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15">
                {isDivisao ? (
                  <Calculator className="size-6 text-primary" aria-hidden />
                ) : (
                  <Building2 className="size-6 text-primary" aria-hidden />
                )}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Ferramenta gratuita
                </p>
                <p className="text-lg font-semibold text-foreground">
                  {isDivisao ? "Divisão de contas" : "Consulta CNPJ"}
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 py-6 sm:px-8 sm:py-8">
            <ul className="space-y-2.5" role="list">
              {(isDivisao ? DIVISAO_BULLETS : CNPJ_BULLETS).map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-slate-700">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>

            <Link
              href={
                isDivisao
                  ? "/ferramentas/divisao-de-contas"
                  : "/ferramentas/consulta-cnpj"
              }
              className={cn(
                "mt-8 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 text-base font-semibold",
                "bg-primary text-primary-foreground transition-colors hover:bg-primary/90",
                "sm:w-auto sm:inline-flex"
              )}
            >
              {isDivisao ? "Abrir divisão de contas" : "Consultar CNPJ agora"}
              <ArrowRight className="size-4 shrink-0" aria-hidden />
            </Link>

            <p className="mt-4 text-center text-xs text-muted-foreground sm:text-left">
              <Link href="/ferramentas" className="font-medium text-primary hover:underline">
                Ver todas as ferramentas
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
