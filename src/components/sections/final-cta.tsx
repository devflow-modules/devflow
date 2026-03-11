import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { WhatsAppCta } from "@/components/shared/whatsapp-cta";
import { cn } from "@/lib/utils";

export function FinalCta() {
  return (
    <section
      id="cta-final"
      className="relative overflow-hidden bg-[#f1f5f9] py-24"
      aria-labelledby="final-cta-heading"
    >
      {/* Assinatura visual — grid + glow sutil */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden
      >
        <div
          className="absolute -right-20 -top-20 h-60 w-60 rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(circle, rgba(34, 197, 94, 0.2) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full opacity-15"
          style={{
            background:
              "radial-gradient(circle, rgba(56, 189, 248, 0.2) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.6) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(15, 23, 42, 0.6) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
      </div>
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div
          className={cn(
            "mx-auto max-w-2xl rounded-xl border border-border bg-card p-8 text-center shadow-sm sm:p-12",
            "transition-all duration-200 hover:shadow-lg"
          )}
        >
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-primary" aria-hidden />
          <h2
            id="final-cta-heading"
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Veja a DevFlow funcionando
          </h2>
          <p className="mt-4 text-slate-600">
            Teste a automação de atendimento. Converse pelo WhatsApp ou veja a demonstração.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-4">
            <WhatsAppCta label="Falar no WhatsApp" size="lg" />
            <Link
              href="/segmentos/tabacarias"
              className={cn(
                "inline-flex items-center justify-center gap-2 h-12 rounded-lg border border-[#e2e8f0] px-5 text-base font-semibold",
                "bg-white text-foreground transition-all duration-200 hover:bg-[#f1f5f9]"
              )}
            >
              Ver demonstração
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
