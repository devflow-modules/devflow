import Link from "next/link";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** Slug da ferramenta principal (ex: ferramentas/financeiro) */
  toolHref?: string;
  toolLabel?: string;
};

/**
 * Seção "Por que confiar no DevFlow?" — autoridade interna e consistência.
 * Reforça utilidade real e produto em produção.
 */
export function TrustSection({
  className,
  toolHref = "/ferramentas/financeiro",
  toolLabel = "Financeiro",
}: Props) {
  return (
    <section
      className={cn(
        "border-t border-border bg-slate-50/80 py-12 sm:py-14",
        className
      )}
      aria-labelledby="trust-heading"
    >
      <div className="mx-auto max-w-[720px] px-4 sm:px-6 lg:px-8">
        <h2
          id="trust-heading"
          className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
        >
          Por que confiar no DevFlow?
        </h2>
        <ul className="mt-6 space-y-4 text-base leading-relaxed text-slate-700" role="list">
          <li className="flex gap-3">
            <span className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary" aria-hidden>1</span>
            <span>
              <strong className="text-foreground">Produto em produção.</strong> As ferramentas e o sistema financeiro não são protótipo: estão em uso por usuários reais, com dados reais e integrações que funcionam no dia a dia.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary" aria-hidden>2</span>
            <span>
              <strong className="text-foreground">Foco em utilidade.</strong> Cada recurso foi pensado para resolver um problema concreto: recorrências para não esquecer contas, orçamento para não estourar, separação PF/PJ para quem tem CNPJ.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary" aria-hidden>3</span>
            <span>
              <strong className="text-foreground">Consistência.</strong> O mesmo padrão de clareza e praticidade em todas as páginas e ferramentas: você encontra o que precisa sem surpresas. Sem cartão para testar; cancele quando quiser.
            </span>
          </li>
        </ul>
        <p className="mt-6">
          <Link
            href={toolHref}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Conhecer a ferramenta {toolLabel} →
          </Link>
        </p>
      </div>
    </section>
  );
}
