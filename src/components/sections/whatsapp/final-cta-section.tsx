import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { WhatsAppCta } from "@/components/shared/whatsapp-cta";
import { cn } from "@/lib/utils";

export function FinalCTASection() {
  return (
    <section aria-labelledby="final-cta-heading" className="df-page border-t df-border-brand py-20 sm:py-24">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="df-surface-elevated mx-auto max-w-4xl rounded-3xl border border-border p-8 text-center shadow-[0_24px_80px_-20px_rgba(0,0,0,0.35)] sm:p-12">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary/90 sm:text-sm">Chega de fila parada</p>
          <h2
            id="final-cta-heading"
            className="df-text-primary mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Quer sair da conversa com um plano de implementação claro?
          </h2>
          <p className="df-text-secondary mx-auto mt-4 max-w-2xl text-base font-semibold leading-snug sm:text-lg">
            Comece com diagnóstico e veja a demo guiada para entender como a operação funciona no dia a dia.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <WhatsAppCta
              size="lg"
              label="Agendar diagnóstico"
              text="Quero agendar um diagnóstico da minha operação de atendimento e vendas no WhatsApp."
              className={cn(
                "w-full min-h-[3.25rem] justify-center shadow-[0_14px_40px_-6px_rgba(22,163,74,0.45)] sm:w-auto sm:min-w-[min(100%,17.5rem)]",
                "ring-2 ring-emerald-400/35 ring-offset-2 ring-offset-background",
                "hover:brightness-[1.03] active:brightness-[0.98]"
              )}
            />
            <Link
              href="/demo"
              className={cn(
                "inline-flex h-[3.25rem] w-full items-center justify-center gap-2 rounded-xl border-2 df-border-brand bg-card px-6 text-base font-semibold text-foreground",
                "shadow-sm transition-all hover:border-primary/40 hover:bg-primary/10 sm:w-auto sm:min-w-[11rem]"
              )}
            >
              Ver demo em 2 minutos
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <p className="df-text-secondary mx-auto mt-6 max-w-lg text-center text-xs font-medium leading-relaxed sm:text-sm">
            Prefere e-mail?{" "}
            <Link
              href="/contato"
              className="font-bold text-foreground underline decoration-slate-300 underline-offset-4 hover:text-primary hover:decoration-primary/40"
            >
              Falar com especialista
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
