"use client";

import { useEffect } from "react";
import Link from "next/link";

import { ApplyFlowButton } from "@/components/ui/ApplyFlowButton";
import { captureApplyFlowException } from "@/lib/observability/error-tracking";

export default function ApplyFlowError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureApplyFlowException(error, {
      area: "boundary",
      route: "app/error",
      digest: error.digest,
    });
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-xl font-semibold text-[color:var(--af-text)]">Algo correu mal</h1>
      <p className="mt-3 text-sm text-[color:var(--af-text-muted)]">
        Não foi possível mostrar esta página. Podes tentar outra vez ou voltar ao dashboard.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <ApplyFlowButton type="button" onClick={() => reset()}>
          Tentar novamente
        </ApplyFlowButton>
        <Link
          href="/dashboard"
          className="text-sm text-emerald-200 underline underline-offset-2"
        >
          Ir ao dashboard
        </Link>
      </div>
    </main>
  );
}
