"use client";

import { useEffect } from "react";
import Link from "next/link";

import { captureApplyFlowException } from "@/lib/observability/error-tracking";

export default function ApplyFlowGlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureApplyFlowException(error, {
      area: "boundary",
      route: "app/global-error",
      digest: error.digest,
    });
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="m-0 flex min-h-dvh flex-col items-center justify-center bg-[#0b1220] px-6 py-8 font-sans text-white antialiased">
        <main className="mx-auto w-full max-w-md text-center">
          <h1 className="m-0 mb-3 text-xl font-semibold tracking-tight">Algo correu mal</h1>
          <p className="mb-6 text-sm leading-relaxed text-white/70">
            Não foi possível carregar a aplicação. Podes tentar de novo ou voltar ao início.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="cursor-pointer rounded-lg border-0 bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-emerald-950"
            >
              Tentar novamente
            </button>
            <Link
              href="/"
              className="inline-flex items-center rounded-lg border border-white/20 px-4 py-2.5 text-sm font-medium text-white/90 no-underline"
            >
              Ir ao início
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
