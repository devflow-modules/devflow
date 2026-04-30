"use client";

import { useSessionRole } from "@/components/navigation/SessionRoleContext";
import Link from "next/link";

/** Faixa só na área `/admin/*` — separação visual da app tenant. */
export function AdminDevFlowBanner() {
  const { tenantId } = useSessionRole();

  return (
    <div
      role="note"
      data-testid="admin-devflow-banner"
      className="border-b border-amber-500/55 bg-linear-to-r from-amber-950/95 via-slate-900/95 to-slate-950/95 px-4 py-2.5 text-amber-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
    >
      <p className="text-sm font-semibold tracking-tight">Modo Plataforma — área interna DevFlow</p>
      <p className="mt-0.5 max-w-4xl text-xs text-amber-100/90">
        Ferramentas de suporte e operações da plataforma. Não partilhe com clientes finais.
        {tenantId ? (
          <>
            {" "}
            Contexto atual: tenant <span className="font-mono text-amber-50/95">{tenantId}</span>.
          </>
        ) : null}
      </p>
      <p className="mt-2 text-[11px] text-amber-200/85">
        <Link href="/inbox" className="underline decoration-amber-300/80 underline-offset-2 hover:text-white">
          Ir para inbox do tenant (app operacional)
        </Link>
      </p>
    </div>
  );
}
