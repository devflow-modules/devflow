import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";

export function HeroSection({
  isAuthenticated,
  panelHref,
  marketingSiteUrl,
}: {
  isAuthenticated: boolean;
  panelHref: string;
  marketingSiteUrl: string | null;
}) {
  return (
    <section className="text-center">
      <h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl md:text-[2.5rem] md:leading-tight">
        WhatsApp com IA para atendimento, operação e vendas
      </h1>
      <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-slate-600 sm:text-lg">
        Centralize conversas, priorize leads e automatize follow-ups em um único painel.
      </p>

      <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        {isAuthenticated ? (
          <Link href={panelHref} className={buttonClassName("primary", "min-h-[44px] w-full px-8 sm:w-auto")}>
            Ir para o painel
          </Link>
        ) : (
          <>
            <Link
              href="/login?next=%2Fdashboard%2Fai"
              className={buttonClassName("primary", "min-h-[44px] w-full px-8 sm:w-auto")}
            >
              Entrar
            </Link>
            <Link
              href="/signup"
              className={buttonClassName("secondary", "min-h-[44px] w-full px-8 sm:w-auto")}
            >
              Criar conta
            </Link>
          </>
        )}
        {marketingSiteUrl ? (
          <a
            href={marketingSiteUrl}
            className={buttonClassName("ghost", "min-h-[44px] w-full sm:w-auto")}
            rel="noopener noreferrer"
            target="_blank"
          >
            Site DevFlow
          </a>
        ) : null}
      </div>
    </section>
  );
}
