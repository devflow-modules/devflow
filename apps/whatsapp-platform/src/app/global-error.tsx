"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * UI mínima proposital: não importa AppShell, providers de sessão nem hooks de navegação.
 * O erro global renderiza fora da árvore normal do layout e deve permanecer isolado.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body className="m-0 flex min-h-dvh flex-col items-center justify-center bg-black px-6 py-8 font-sans text-white antialiased">
        <main className="mx-auto w-full max-w-md text-center">
          <h1 className="m-0 mb-3 text-xl font-semibold tracking-tight">Algo deu errado</h1>
          <p className="mb-5 text-[0.9375rem] leading-relaxed text-white/70">
            Não foi possível carregar a aplicação. Pode tentar de novo ou voltar ao início.
          </p>
          {process.env.NODE_ENV === "development" && error?.message ? (
            <pre className="mb-6 max-h-40 overflow-auto rounded-lg border border-white/10 bg-card/10 p-3 text-left text-xs text-white/80">
              {error.message}
            </pre>
          ) : null}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button variant="secondary"
              type="button"
              onClick={() => reset()}
              className="cursor-pointer rounded-lg border-0 bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-500"
            >
              Tentar novamente
            </Button>
            <Link
              href="/"
              className="inline-flex items-center rounded-lg border border-white/20 px-4 py-2.5 text-sm font-medium text-white/90 no-underline transition hover:border-white/30 hover:bg-card/20"
            >
              Ir ao início
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
