import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import type { ReactNode } from "react";

export function ApplyFlowPrivacyNotice({ children }: { children?: ReactNode }) {
  return (
    <ApplyFlowCard variant="success" padding="md">
      <p className="text-sm leading-relaxed text-emerald-100/95">
        {children ?? (
          <>
            <strong className="text-emerald-300">Privacidade local-first:</strong> os teus dados ficam neste navegador. O
            ApplyFlow não envia o JSON importado nem o histórico para servidores do produto. Importações e a demo gravam em{" "}
            <code className="rounded bg-zinc-900/90 px-1.5 py-0.5 text-[11px] text-emerald-200/90">localStorage</code> até
            limpares o site ou os dados do browser.
          </>
        )}
      </p>
    </ApplyFlowCard>
  );
}
