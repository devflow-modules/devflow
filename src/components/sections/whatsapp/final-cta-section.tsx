import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { WhatsAppCta } from "@/components/shared/whatsapp-cta";
import { cn } from "@/lib/utils";

export function FinalCTASection() {
  return (
    <section aria-labelledby="final-cta-heading" className="border-t border-border py-20 sm:py-24">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-3xl border border-border bg-card p-8 text-center shadow-[0_24px_80px_-20px_rgba(15,23,42,0.18)] sm:p-12">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary/90 sm:text-sm">Chega de fila parada</p>
          <h2
            id="final-cta-heading"
            className="mt-3 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
          >
            Quer sentir o produto trabalhando por você ainda hoje?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base font-semibold leading-snug text-slate-700 sm:text-lg">
            Uma conversa com vendas ou 2 minutos de demo — você escolhe o ritmo. O ganho é o mesmo: menos lead morto,
            mais deal vivo.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <WhatsAppCta
              size="lg"
              label="Reservar conversa com vendas"
              text="Estou perdendo venda no WhatsApp por fila e demora. Quero reservar conversa com vendas da DevFlow WhatsApp Platform ainda hoje."
              className={cn(
                "w-full min-h-[3.25rem] justify-center shadow-[0_14px_40px_-6px_rgba(22,163,74,0.45)] sm:w-auto sm:min-w-[min(100%,17.5rem)]",
                "ring-2 ring-emerald-400/35 ring-offset-2 ring-offset-background",
                "hover:brightness-[1.03] active:brightness-[0.98]"
              )}
            />
            <Link
              href="/demo"
              className={cn(
                "inline-flex h-[3.25rem] w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-6 text-base font-semibold text-slate-800",
                "shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 sm:w-auto sm:min-w-[11rem]"
              )}
            >
              Ver demo em 2 minutos
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <p className="mx-auto mt-6 max-w-lg text-center text-xs font-medium leading-relaxed text-muted-foreground sm:text-sm">
            Prefere e-mail?{" "}
            <Link
              href="/contato"
              className="font-bold text-foreground underline decoration-slate-300 underline-offset-4 hover:text-primary hover:decoration-primary/40"
            >
              Mandar briefing
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
