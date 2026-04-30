"use client";

import Link from "next/link";
import { isWhiteLabelMode } from "@/lib/productMode";
import { Button } from "@/components/ui/button";

export function DeveloperHeaderQuickActions() {
  return (
    <>
      <Link href="/settings" className="df-quick-action">
        Configurações
      </Link>
      {!isWhiteLabelMode() ? (
        <Link href="/billing" className="df-quick-action">
          Cobrança
        </Link>
      ) : null}
      <Button variant="secondary"
        type="button"
        className="df-quick-action"
        onClick={() => document.getElementById("dev-api-generate-btn")?.click()}
      >
        Gerar ou regenerar chave
      </Button>
    </>
  );
}
