"use client";

import Link from "next/link";

export function DeveloperHeaderQuickActions() {
  return (
    <>
      <Link href="/settings" className="df-quick-action">
        Configurações
      </Link>
      <Link href="/billing" className="df-quick-action">
        Cobrança
      </Link>
      <button
        type="button"
        className="df-quick-action"
        onClick={() => document.getElementById("dev-api-generate-btn")?.click()}
      >
        Gerar ou regenerar chave
      </button>
    </>
  );
}
