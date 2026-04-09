"use client";

import Link from "next/link";

const qaClass =
  "rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200/90 transition hover:bg-slate-50";

export function DeveloperHeaderQuickActions() {
  return (
    <>
      <Link href="/settings" className={qaClass}>
        Configurações
      </Link>
      <Link href="/billing" className={qaClass}>
        Cobrança
      </Link>
      <button
        type="button"
        className={qaClass}
        onClick={() => document.getElementById("dev-api-generate-btn")?.click()}
      >
        Gerar ou regenerar chave
      </button>
    </>
  );
}
